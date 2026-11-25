const test = require('node:test');
const assert = require('node:assert/strict');
const {
    generateX25519Keypair,
    encryptPayload,
    wrapKeyForBuyer,
    unwrapKey,
    decryptPayload,
} = require('./crypto');

test('flujo completo: cifrado AES-256-GCM, wrapping X25519, verificación de compromiso y descifrado', () => {
    const originalData = Buffer.from('Stellar_Storage: contenido científico cifrado de alto valor 2026.', 'utf8');

    // 1. Creador cifra localmente
    const { encryptedBlob, assetHashHex, keyCommitmentHex, aesKeyHex } = encryptPayload(originalData);
    assert.notEqual(encryptedBlob.indexOf('contenido científico'), 0);
    assert.equal(assetHashHex.length, 64);
    assert.equal(keyCommitmentHex.length, 64);

    // 2. Comprador genera par efímero X25519
    const buyer = generateX25519Keypair();
    assert.equal(buyer.publicKeyHex.length, 64);
    assert.equal(buyer.privateKeyHex.length, 64);

    // 3. Creador envuelve K_AES tras confirmar escrow en Soroban
    const wrappedKeyHex = wrapKeyForBuyer(aesKeyHex, buyer.publicKeyHex, assetHashHex);
    assert.equal(Buffer.from(wrappedKeyHex, 'hex').length, 92);

    // 4. Comprador desenvuelve K_AES y verifica compromiso on-chain
    const recoveredAesKeyHex = unwrapKey(
        wrappedKeyHex,
        buyer.privateKeyHex,
        buyer.publicKeyHex,
        assetHashHex,
        keyCommitmentHex
    );
    assert.equal(recoveredAesKeyHex, aesKeyHex);

    // 5. Descifrado final del blob .stst
    const decrypted = decryptPayload(encryptedBlob, recoveredAesKeyHex);
    assert.deepEqual(decrypted, originalData);
});

test('rechaza clave privada incorrecta de un tercero', () => {
    const originalData = Buffer.from('Datos confidenciales', 'utf8');
    const { encryptedBlob, assetHashHex, keyCommitmentHex, aesKeyHex } = encryptPayload(originalData);

    const buyer = generateX25519Keypair();
    const attacker = generateX25519Keypair();
    const wrappedKeyHex = wrapKeyForBuyer(aesKeyHex, buyer.publicKeyHex, assetHashHex);

    assert.throws(() => {
        unwrapKey(
            wrappedKeyHex,
            attacker.privateKeyHex,
            attacker.publicKeyHex,
            assetHashHex,
            keyCommitmentHex
        );
    });

    assert.equal(encryptedBlob.subarray(0, 4).toString('ascii'), 'STST');
});

test('rechaza compromiso alterado (key_commitment mismatch)', () => {
    const originalData = Buffer.from('Verificación de integridad de llave', 'utf8');
    const { assetHashHex, aesKeyHex } = encryptPayload(originalData);
    const buyer = generateX25519Keypair();
    const wrappedKeyHex = wrapKeyForBuyer(aesKeyHex, buyer.publicKeyHex, assetHashHex);

    const wrongCommitment = '00'.repeat(32);
    assert.throws(
        () => unwrapKey(wrappedKeyHex, buyer.privateKeyHex, buyer.publicKeyHex, assetHashHex, wrongCommitment),
        /key_commitment/
    );
});

test('rechaza blob .stst manipulado (integridad AES-GCM)', () => {
    const originalData = Buffer.from('Payload íntegro sin alteraciones', 'utf8');
    const { encryptedBlob, aesKeyHex } = encryptPayload(originalData);

    const tampered = Buffer.from(encryptedBlob);
    tampered[tampered.length - 1] ^= 0xff;

    assert.throws(() => {
        decryptPayload(tampered, aesKeyHex);
    });
});
