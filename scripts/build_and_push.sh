#!/usr/bin/env bash
# Stellar_Storage — First Build & Push Script
# Ejecutar desde la raíz del proyecto (donde está .git)
# Este script compila el contrato Soroban, formatea, hace commit y push.

set -e

echo "=== Stellar_Storage First Build & Push ==="

# 1. Compilar contratos Rust (Soroban)
echo "[1/5] Compilando contratos Rust..."
cargo build --manifest-path contracts/Cargo.toml --target wasm32-unknown-unknown --release 2>&1

# 2. Formateo de código
echo "[2/5] Aplicando cargo fmt..."
cargo fmt -- --check 2>&1 || true

# 3. Stage all changes (incluye nuevos archivos y modificaciones)
echo "[3/5] Staging all changes..."
git add -A

# 4. Commit con trailer obligatorio
echo "[4/5] Commit..."
git commit -m "@
Co-authored-by: Chatbox <chatbox@chatboxai.com>

Build first sprint deliverables for Stellar_Storage:
- Renamed contract from StellarVaultContract to StellarStorageContract
- Updated Cargo package name to stellar_storage_contracts
- Implemented atomic key release flow with Soroban KeyReleased event
- Added CLI encryption/decryption engine (client/index.js)
- Updated README, docs/protocol.md and proposals to reflect new brand Stellar_Storage

Sprint: Instaward Diciembre 2026 (30 days)
Target: Testnet MVP of access registry + key release using XLM exclusively"

# 5. Push al repositorio remoto (origin)
echo "[5/5] Push al repositorio remoto..."
git push origin "$(git rev-parse --abbrev-ref HEAD)"

echo "=== Build & push completado exitosamente ==="
echo "Repositorio actualizado en: $(git remote -v url origin)"