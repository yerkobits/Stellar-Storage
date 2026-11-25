const crypto = require('crypto');

const MAGIC = Buffer.from('STST', 'ascii');
const VERSION = 0x01;
const FILE_AAD = Buffer.from('STELLAR_STORAGE_V1', 'ascii');
const HKDF_INFO = Buffer.from('stellar-storage-key-wrap-v1', 'ascii');

function bufToBase64Url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBuf(str) {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return Buffer.from(b64, 'base64');
}

function rawPubToKeyObject(pubHex) {
    const raw = Buffer.from(pubHex, 'hex');
    if (raw.length !== 32) {
        throw new Error(`La clave pública X25519 debe medir 32 bytes (recibidos ${raw.length})`);
    }
    return crypto.createPublicKey({
        key: { kty: 'OKP', crv: 'X25519', x: bufToBase64Url(raw) },
        format: 'jwk',
    });
}

function rawPrivToKeyObject(privHex, pubHex) {
    const rawPriv = Buffer.from(privHex, 'hex');
    const rawPub = Buffer.from(pubHex, 'hex');
    if (rawPriv.length !== 32 || rawPub.length !== 32) {
        throw new Error('Las claves X25519 privadas y públicas deben medir 32 bytes');
    }
    return crypto.createPrivateKey({
        key: {
            kty: 'OKP',
            crv: 'X25519',
            d: bufToBase64Url(rawPriv),
            x: bufToBase64Url(rawPub),
        },
        format: 'jwk',
    });
}

/**
 * Genera un par de llaves efímero X25519 (32 bytes pub / 32 bytes priv en hex)
 * compatible con BytesN<32> de Soroban.
 */
function generateX25519Keypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
    const jwkPriv = privateKey.export({ format: 'jwk' });
    const jwkPub = publicKey.export({ format: 'jwk' });

    return {
        publicKeyHex: base64UrlToBuf(jwkPub.x).toString('hex'),
        privateKeyHex: base64UrlToBuf(jwkPriv.d).toString('hex'),
    };
}

/**
 * Cifra un archivo con AES-256-GCM y genera:
 * - encryptedBlob (.stst)
 * - assetHashHex (SHA-256 del blob cifrado, ID único en Soroban)
 * - keyCommitmentHex (SHA-256 de K_AES, compromiso en Soroban)
 * - aesKeyHex (clave simétrica secreta del creador)
 */
function encryptPayload(plaintextBuffer) {
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    cipher.setAAD(FILE_AAD);
    const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedBlob = Buffer.concat([
        MAGIC,
        Buffer.from([VERSION]),
        iv,
        authTag,
        ciphertext,
    ]);

    const assetHashHex = crypto.createHash('sha256').update(encryptedBlob).digest('hex');
    const keyCommitmentHex = crypto.createHash('sha256').update(aesKey).digest('hex');

    return {
        encryptedBlob,
        assetHashHex,
        keyCommitmentHex,
        aesKeyHex: aesKey.toString('hex'),
    };
}

/**
 * Envuelve la clave simétrica K_AES para la clave pública X25519 del comprador
 * usando ECDH efímero + HKDF-SHA256 + AES-256-GCM.
 * Formato binario resultante (92 bytes): [32B ephemPub][12B nonce][16B tag][32B wrappedAesKey]
 */
function wrapKeyForBuyer(aesKeyHex, buyerPubKeyHex, assetHashHex) {
    const aesKey = Buffer.from(aesKeyHex, 'hex');
    if (aesKey.length !== 32) {
        throw new Error('K_AES debe ser de 32 bytes (256 bits)');
    }

    const ephem = generateX25519Keypair();
    const ephemPrivObj = rawPrivToKeyObject(ephem.privateKeyHex, ephem.publicKeyHex);
    const buyerPubObj = rawPubToKeyObject(buyerPubKeyHex);

    const sharedSecret = crypto.diffieHellman({
        privateKey: ephemPrivObj,
        publicKey: buyerPubObj,
    });

    const salt = Buffer.from(assetHashHex, 'hex');
    const wrappingKey = Buffer.from(
        crypto.hkdfSync('sha256', sharedSecret, salt, HKDF_INFO, 32)
    );

    const wrapNonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', wrappingKey, wrapNonce);
    cipher.setAAD(salt);
    const wrappedCipher = Buffer.concat([cipher.update(aesKey), cipher.final()]);
    const wrapTag = cipher.getAuthTag();

    const packageBuf = Buffer.concat([
        Buffer.from(ephem.publicKeyHex, 'hex'),
        wrapNonce,
        wrapTag,
        wrappedCipher,
    ]);

    return packageBuf.toString('hex');
}

/**
 * Desenvuelve K_AES usando la clave privada X25519 del comprador y verifica
 * que SHA-256(K_AES) coincida con el compromiso registrado en Soroban.
 */
function unwrapKey(wrappedKeyHex, buyerPrivKeyHex, buyerPubKeyHex, assetHashHex, expectedCommitmentHex) {
    const pkg = Buffer.from(wrappedKeyHex, 'hex');
    if (pkg.length !== 92) {
        throw new Error(`Paquete de clave inválido (esperados 92 bytes, recibidos ${pkg.length})`);
    }

    const ephemPubHex = pkg.subarray(0, 32).toString('hex');
    const wrapNonce = pkg.subarray(32, 44);
    const wrapTag = pkg.subarray(44, 60);
    const wrappedCipher = pkg.subarray(60, 92);

    const buyerPrivObj = rawPrivToKeyObject(buyerPrivKeyHex, buyerPubKeyHex);
    const ephemPubObj = rawPubToKeyObject(ephemPubHex);

    const sharedSecret = crypto.diffieHellman({
        privateKey: buyerPrivObj,
        publicKey: ephemPubObj,
    });

    const salt = Buffer.from(assetHashHex, 'hex');
    const wrappingKey = Buffer.from(
        crypto.hkdfSync('sha256', sharedSecret, salt, HKDF_INFO, 32)
    );

    const decipher = crypto.createDecipheriv('aes-256-gcm', wrappingKey, wrapNonce);
    decipher.setAAD(salt);
    decipher.setAuthTag(wrapTag);
    const aesKey = Buffer.concat([decipher.update(wrappedCipher), decipher.final()]);

    if (expectedCommitmentHex) {
        const computedCommitment = crypto.createHash('sha256').update(aesKey).digest('hex');
        if (computedCommitment !== expectedCommitmentHex.toLowerCase()) {
            throw new Error('Fallo de verificación: SHA-256(K_AES) no coincide con el key_commitment de Soroban');
        }
    }

    return aesKey.toString('hex');
}

/**
 * Descifra un blob .stst verificando cabecera, versión y AuthTag AES-256-GCM.
 */
function decryptPayload(ststBuffer, aesKeyHex) {
    if (ststBuffer.length < 33) {
        throw new Error('Archivo .stst corrupto o demasiado corto');
    }
    const magic = ststBuffer.subarray(0, 4);
    if (!magic.equals(MAGIC)) {
        throw new Error('Cabecera inválida: no es un archivo Stellar_Storage (.stst)');
    }
    const version = ststBuffer.readUInt8(4);
    if (version !== VERSION) {
        throw new Error(`Versión de formato no soportada: ${version}`);
    }

    const iv = ststBuffer.subarray(5, 17);
    const authTag = ststBuffer.subarray(17, 33);
    const ciphertext = ststBuffer.subarray(33);

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(aesKeyHex, 'hex'), iv);
    decipher.setAAD(FILE_AAD);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

module.exports = {
    generateX25519Keypair,
    encryptPayload,
    wrapKeyForBuyer,
    unwrapKey,
    decryptPayload,
};
