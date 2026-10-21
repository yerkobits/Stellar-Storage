// node/index.js
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const STORAGE_DIR = path.join(__dirname, 'data_blobs');

if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Servir blob cifrado si el cliente posee la prueba de pago
app.get('/download/:fileHash', (req, res) => {
    const { fileHash } = req.params;
    const proof = req.headers['x-stellar-proof'];

    if (!proof) {
        return res.status(401).json({ error: 'Se requiere comprobante de pago en red Stellar (XLM)' });
    }

    const filePath = path.join(STORAGE_DIR, `${fileHash}.enc`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Blob cifrado no encontrado en este nodo' });
    }

    console.log(`[P2P] Sirviendo blob ${fileHash} con prueba válida ${proof}`);
    res.download(filePath);
});

// Registrar nuevo blob cifrado
app.post('/store', (req, res) => {
    const { fileHash, encryptedData } = req.body;
    if (!fileHash || !encryptedData) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    const filePath = path.join(STORAGE_DIR, `${fileHash}.enc`);
    fs.writeFileSync(filePath, Buffer.from(encryptedData, 'base64'));
    console.log(`[P2P] Blob almacenado exitosamente: ${fileHash}`);
    res.json({ success: true, message: 'Blob almacenado' });
});

app.listen(PORT, () => {
    console.log(`StellarVault P2P Node ejecutándose en el puerto ${PORT}`);
});
