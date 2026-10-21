// scripts/diagnostic.js
const { execSync } = require('child_process');
const fs = require('fs');

console.log("=== StelarVault Diagnostic Tool ===");

function checkCommand(name, cmd) {
    try {
        const ver = execSync(cmd, { encoding: 'utf8' }).trim();
        console.log(`[OK] ${name}: ${ver}`);
        return true;
    } catch (e) {
        console.log(`[FAIL] ${name} no está disponible o falló: ${e.message.trim()}`);
        return false;
    }
}

checkCommand("Node.js", "node -v");
checkCommand("NPM", "npm -v");
checkCommand("Rustc", "rustc --version");
checkCommand("Cargo", "cargo --version");
checkCommand("Soroban CLI", "soroban --version");

const dirs = ['contracts', 'node', 'client', 'scripts', 'docs'];
console.log("\nVerificando estructura de directorios:");
dirs.forEach(d => {
    if (fs.existsSync(d)) {
        console.log(`[OK] Directorio '${d}' existe.`);
    } else {
        console.log(`[X] Directorio '${d}' falta (debe crearse).`);
    }
});

console.log("\nDiagnóstico completado.");
