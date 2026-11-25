// client/index.js — Stellar_Storage CLI (AES-256-GCM + X25519 Key Release)
const fs = require('fs');
const path = require('path');
const {
    generateX25519Keypair,
    encryptPayload,
    wrapKeyForBuyer,
    unwrapKey,
    decryptPayload,
} = require('./crypto');

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
    console.log('=== Stellar_Storage CLI ===');
    console.log('Comandos disponibles:');
    console.log('  node client/index.js keygen [archivo_salida.json]');
    console.log('      Genera par X25519 para solicitar acceso y descifrar claves en Soroban.');
    console.log('  node client/index.js encrypt <archivo> [salida_dir]');
    console.log('      Cifra con AES-256-GCM -> genera <archivo>.stst y <archivo>.manifest.json.');
    console.log('  node client/index.js wrap-key <manifest.json> <buyer_pubkey_hex>');
    console.log('      Envuelve K_AES para el comprador (ECDH X25519 + HKDF) listo para release_key().');
    console.log('  node client/index.js decrypt <archivo.stst> <wrapped_key_hex> <keypair.json> <asset_hash_hex> <commitment_hex> [salida]');
    console.log('      Desenvuelve K_AES, valida compromiso SHA-256 y descifra el archivo original.');
    console.log('  node client/index.js publish <archivo.stst> [url_nodo]');
    console.log('      Sube un blob cifrado .stst a un nodo de almacenamiento.');
}

async function main() {
    if (command === 'keygen') {
        const outFile = args[1] || 'buyer-keypair.json';
        const kp = generateX25519Keypair();
        fs.writeFileSync(outFile, JSON.stringify(kp, null, 2));
        console.log(`[OK] Par X25519 guardado en ${outFile}`);
        console.log(`     buyer_pubkey (Soroban BytesN<32>): ${kp.publicKeyHex}`);

    } else if (command === 'encrypt') {
        const filePath = args[1];
        if (!filePath || !fs.existsSync(filePath)) {
            console.error('Uso: node client/index.js encrypt <archivo> [salida_dir]');
            process.exit(1);
        }

        const outDir = args[2] || path.dirname(filePath);
        const baseName = path.basename(filePath);
        const plaintext = fs.readFileSync(filePath);
        const res = encryptPayload(plaintext);

        const ststPath = path.join(outDir, `${baseName}.stst`);
        const manifestPath = path.join(outDir, `${baseName}.manifest.json`);

        fs.writeFileSync(ststPath, res.encryptedBlob);
        fs.writeFileSync(
            manifestPath,
            JSON.stringify(
                {
                    originalFile: baseName,
                    asset_hash: res.assetHashHex,
                    key_commitment: res.keyCommitmentHex,
                    aes_key_secret: res.aesKeyHex,
                    cipher: 'AES-256-GCM',
                },
                null,
                2
            )
        );

        console.log(`[OK] Archivo cifrado: ${ststPath}`);
        console.log(`[OK] Manifest secreto (NO subir público): ${manifestPath}`);
        console.log(`     asset_hash     (Soroban): ${res.assetHashHex}`);
        console.log(`     key_commitment (Soroban): ${res.keyCommitmentHex}`);

    } else if (command === 'wrap-key') {
        const manifestPath = args[1];
        const buyerPubHex = args[2];
        if (!manifestPath || !fs.existsSync(manifestPath) || !buyerPubHex) {
            console.error('Uso: node client/index.js wrap-key <manifest.json> <buyer_pubkey_hex>');
            process.exit(1);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const wrappedKeyHex = wrapKeyForBuyer(
            manifest.aes_key_secret,
            buyerPubHex,
            manifest.asset_hash
        );
        console.log('[OK] Clave envuelta (wrapped_key para Soroban release_key):');
        console.log(wrappedKeyHex);

    } else if (command === 'decrypt') {
        const [, ststPath, wrappedKeyHex, keypairPath, assetHashHex, commitmentHex, outPath] = args;
        if (!ststPath || !wrappedKeyHex || !keypairPath || !assetHashHex || !commitmentHex) {
            console.error(
                'Uso: node client/index.js decrypt <archivo.stst> <wrapped_key_hex> <keypair.json> <asset_hash_hex> <commitment_hex> [salida]'
            );
            process.exit(1);
        }

        const kp = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        const aesKeyHex = unwrapKey(
            wrappedKeyHex,
            kp.privateKeyHex,
            kp.publicKeyHex,
            assetHashHex,
            commitmentHex
        );
        const ststBuffer = fs.readFileSync(ststPath);
        const plaintext = decryptPayload(ststBuffer, aesKeyHex);

        const targetOut = outPath || ststPath.replace(/\.stst$/, '.decrypted');
        fs.writeFileSync(targetOut, plaintext);
        console.log(`[OK] Compromiso verificado y archivo descifrado en: ${targetOut}`);

    } else if (command === 'publish') {
        const filePath = args[1];
        const nodeUrl = args[2] || 'http://localhost:8080';
        if (!filePath || !fs.existsSync(filePath)) {
            console.error('Uso: node client/index.js publish <archivo.stst> [url_nodo]');
            process.exit(1);
        }

        const blob = fs.readFileSync(filePath);
        const crypto = require('crypto');
        const fileHash = crypto.createHash('sha256').update(blob).digest('hex');

        const response = await fetch(`${nodeUrl}/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileHash, encryptedData: blob.toString('base64') }),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        console.log('[OK] Blob publicado:', await response.json());

    } else {
        printHelp();
    }
}

main().catch((err) => {
    console.error('[ERROR]', err.message);
    process.exit(1);
});
