// client/index.js
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const args = process.argv.slice(2);
const command = args[0];

if (command === 'publish') {
    const filePath = args[1];
    const nodeUrl = args[2] || 'http://localhost:8080';

    if (!filePath || !fs.existsSync(filePath)) {
        console.error('Uso: node index.js publish <ruta_archivo> [url_nodo]');
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const encryptedData = fileBuffer.toString('base64');

    console.log(`Publicando archivo ${fileHash} en nodo P2P...`);
    axios.post(`${nodeUrl}/store`, { fileHash, encryptedData })
        .then(res => {
            console.log('[ÉXITO] Archivo publicado y registrado en red:', res.data);
        })
        .catch(err => {
            console.error('[ERROR] No se pudo publicar:', err.message);
        });

} else if (command === 'download') {
    const fileHash = args[1];
    const nodeUrl = args[2] || 'http://localhost:8080';

    if (!fileHash) {
        console.error('Uso: node index.js download <file_hash> [url_nodo]');
        process.exit(1);
    }

    console.log(`Descargando blob ${fileHash} desde ${nodeUrl}...`);
    axios.get(`${nodeUrl}/download/${fileHash}`, {
        headers: { 'x-stellar-proof': 'TX_HASH_SIMULATED_XLM_PAYMENT' },
        responseType: 'arraybuffer'
    })
    .then(res => {
        fs.writeFileSync(`${fileHash}.decrypted`, res.data);
        console.log(`[ÉXITO] Archivo descargado y guardado como ${fileHash}.decrypted`);
    })
    .catch(err => {
        console.error('[ERROR] Fallo en la descarga:', err.message);
    });

} else {
    console.log('Comandos disponibles:');
    console.log('  node index.js publish <archivo> [url_nodo]');
    console.log('  node index.js download <hash> [url_nodo]');
}
