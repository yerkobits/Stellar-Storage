# Resumen de Compromiso — Stellar_Storage (Instaward Stellar Chile)

**Fecha de Registro:** Noviembre 2026  
**Programa:** Instawards — Stellar Chile Chapter (November 2026)  
**Proyecto:** Stellar_Storage  
**Builder:** Yerko Pincheira (`yerkobits@gmail.com`)  
**Monto Solicitado:** $3,000 USD (desembolsados en XLM)  
**Fecha de Inicio:** Lunes, 16 de noviembre de 2026  
**Duración del Sprint:** 30 Días  
**Repositorio:** [https://github.com/yerkobits/Stellar-Storage](https://github.com/yerkobits/Stellar-Storage)  
**Siguiente Paso Declarado:** Aplicar a SCF Build Award  

---

## 1. Resumen Ejecutivo y Alcance del Proyecto
**Stellar_Storage** es una infraestructura descentralizada de almacenamiento encriptado y distribución atómica construida sobre **Stellar Network** utilizando Smart Contracts en **Soroban (L1)** y una red P2P de nodos independientes. El protocolo opera exclusivamente con **XLM** como motor económico para micropagos y depósitos de garantía (stakes).

Current decentralized storage solutions (such as Filecoin, Arweave, or IPFS pinning services) often introduce complex secondary utility tokens, high latency for micro-payments, or lack native smart contract logic for immediate content monetization. **Stellar_Storage** is designed from the ground up to utilize **XLM exclusively** as its native economic engine.

Content creators can publish encrypted digital assets (research papers, multimedia, proprietary datasets, and digital goods), while storage nodes stake XLM and receive direct micro-donations in real time upon serving authenticated content blobs.

---

## 2. Declaración de Trabajo Presentada (Statement of Work)

### Texto oficial registrado para Semana 1:
```text
Core Architecture & Soroban Access & Key Release Engine:
- Set up repository structure, CI workflows, and Soroban SDK development environment.
- Design and implement the asset registry data structures (creator metadata, asset pricing in native XLM, access policies).
- Implement atomic payment routing and on-chain payment verification state transitions.
- Write initial unit test suite verifying balance transfers and access state updates in the Soroban test environment.
```

---

## 3. Plan de Entregables por Semana (Sprint de 30 Días)

| Semana | Enfoque Principal | Entregables Técnicos Concretos | Métrica de Verificación |
| :---: | :--- | :--- | :--- |
| **Semana 1**<br>*(16 nov – 22 nov)* | **Soroban Access Registry Contract** | • Implement `contracts/src/lib.rs` with `register_asset`, `purchase_access`, and `KeyReleased` event emission.<br>• Unit tests in Rust covering balance transfers and access state updates. | Contract ID deployed on Testnet; unit tests passing (100% coverage). |
| **Semana 2**<br>*(23 nov – 29 nov)* | **Cryptographic CLI Client** | • AES-256-GCM client engine in `client/` CLI (`stellar-storage encrypt <file>` / `decrypt <hash>`).<br>• Key derivation and receipt verification from Stellar transaction hashes. | CLI successfully encrypts a file and registers it on-chain via Soroban Testnet. |
| **Semana 3**<br>*(30 nov – 06 dic)* | **End-to-End Key Release Flow** | • Upgrade `node/` daemon to validate download requests against Soroban RPC state.<br>• Blob integrity checks, node heartbeat, multi-node serving logic. | Multiple nodes serving content and receiving XLM distribution confirmations on Testnet. |
| **Semana 4**<br>*(07 dic – 15 dic)* | **Documentation, Demo Video & Open Source** | • Full end-to-end flow testing: Publish → Encrypt → Distribute → Pay XLM → Decrypt.<br>• Quickstart guide, CLI docs, and 3-minute video walkthrough. | Executable test script on Testnet + public demo video linked in README. |

---

## 4. Distribución del Presupuesto ($3,000 USD en XLM)

All funds are dedicated exclusively to core engineering, testing, and infrastructure validation:

* **Smart Contract Engineering & Soroban Integration (45% — $1,350):** Finalizing Soroban Rust contracts, key release logic, security checks, and Testnet deployment automation.
* **Cryptographic CLI & Client Development (30% — $900):** AES-256-GCM client engine, key package handling, and CLI developer tools.
* **Testnet Infrastructure, QA & Benchmarking (15% — $450):** Testnet setup, RPC connectivity testing, and end-to-end validation.
* **Documentation, Video Demonstration & Open-Source Kit (10% — $300):** Comprehensive documentation, diagrams, and public video demonstration.

---

## 5. Criterios de Éxito para Evaluación Final
1. **Live Testnet Contract:** Verified contract address on Stellar Testnet Explorer.
2. **Functional CLI:** Any developer can clone repo, run `npm start`, encrypt a file, pay in XLM, and decrypt via CLI.
3. **Atomic XLM Settlement:** On-chain proof that an XLM payment triggers key release.
4. **Open Source & Reproducibility:** Clean GitHub repository under MIT license with full deployment scripts.

---

## 6. Stellar Chile Chapter Participation

* **GitHub:** [github.com/yerkobits](https://github.com/yerkobits)
* **Community:** Active participation in Stellar Chile Chapter channels (Telegram/Discord) and regional ecosystem events.

---

## 7. Next Steps & Post-Sprint Vision

Upon successful execution of this Instaward sprint, **Stellar_Storage** will:
1. Present the functioning Testnet MVP to the **Stellar Chile Chapter** and broader Latin American ecosystem.
2. Prepare a full **Stellar Community Fund (SCF) Build Award** application ($15K–$50K) for decentralized identity (DID) integration, browser extension wallet support (Freighter), and WebRTC peer-to-peer data channels.