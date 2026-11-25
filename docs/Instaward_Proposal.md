# Stellar_Storage — Proposal for Stellar Instaward (Stellar Chile Chapter)

**Project Name:** Stellar_Storage  
**Applicant:** Yerko Pincheira (@yerkobits)  
**Program:** Stellar Instaward — Stellar Chile Chapter (December 2026)  
**Requested Funding:** $3,000 USD (Disbursed in XLM)  
**Sprint Duration:** 30 Days (Execution Sprint)  
**Repository:** [https://github.com/yerkobits/Stellar-Storage](https://github.com/yerkobits/Stellar-Storage)  
**Target Network:** Stellar Network & Soroban Smart Contracts (Testnet MVP)  

---

## 1. Executive Summary

**Stellar_Storage** is a decentralized, encrypted storage and atomic distribution infrastructure built natively on the **Stellar Network** using **Soroban (L1)** smart contracts and an independent peer-to-peer (P2P) node network.

Current decentralized storage solutions (such as Filecoin, Arweave, or IPFS pinning services) often introduce complex secondary utility tokens, high latency for micro-payments, or lack native smart contract logic for immediate content monetization. Stellar_Storage is designed from the ground up to utilize **XLM exclusively** as its native economic engine.

Content creators can publish encrypted digital assets (research papers, multimedia, proprietary datasets, and digital goods), while storage nodes stake XLM and receive direct micro-donations in real time upon serving authenticated content blobs.

---

## 2. Problem Statement & Stellar Opportunity

1. **Lack of Native Content Monetization on Stellar:** While Stellar excels at payments and Soroban provides fast execution, builders lack a native, decentralized storage layer that connects content delivery directly to Stellar payments.
2. **Parasitic Piracy & Sybil Attacks in P2P Storage:** Free-riding peers drain network bandwidth without compensating creators or node operators. Unrestricted node creation invites Sybil flooding and content pollution.
3. **Unnecessary Token Friction:** Many Web3 storage protocols force creators and users to acquire volatile secondary tokens. Stellar_Storage operates strictly with **XLM**, maximizing adoption and ecosystem alignment with Stellar.

---

## 3. Key Release Architecture (Atomic Key Unlock)

To solve the Fair Exchange problem between XLM payment and decryption key delivery, Stellar_Storage implements an **Atomic Key Release via Soroban**:

1. **Client-Side Encryption:** The creator encrypts the asset locally with AES-256-GCM, deriving a symmetric key `K_AES`.
2. **Key Commitment Registration:** The creator registers the asset hash, price in XLM, and a cryptographic commitment `H(K_AES)` in the Soroban `access_registry` contract.
3. **Atomic Payment & Key Release:** When a buyer transfers the required XLM to the Soroban contract, the contract validates the payment and emits a `KeyReleased` event containing the encrypted key package bound to the buyer's ephemeral public key.
4. **Local Decryption:** The buyer's CLI reconstructs `K_AES` from the released package and decrypts the blob locally.

This design guarantees that the key is only released after on-chain payment confirmation, without requiring a trusted third party.

---

## 4. Competitive Landscape

| Criterion | **Stellar_Storage** | Lit Protocol | Storj | Arweave |
| :--- | :--- | :--- | :--- | :--- |
| **Native Token** | **XLM** | LIT | STORJ | AR |
| **Transaction Cost** | Negligible (~0.00001 XLM) | High (EVM gas + node fees) | Medium | High (perpetual payment) |
| **Micropayment Speed** | Instant (Stellar L1 / Soroban) | Slow / EVM-dependent | Centralized / credit card | Slow (~20 min finality) |
| **Cryptographic Model** | AES-256-GCM + Soroban Key Lock | Threshold / MPC | Client-side + P2P nodes | Public by default |
| **Stellar Integration** | **Native 100%** | Requires bridges | None | Requires bridges |

---

## 5. System Architecture

Stellar_Storage is structured as a dual-layer hybrid protocol:

### Layer 1: Consensus & Settlement (Soroban)
* **Node Registry & Stake Escrow:** Storage nodes register their public key and lock a minimum stake in XLM (preventing Sybil attacks).
* **Asset Registry:** Original authors register SHA-256 asset hashes alongside an author stake to prevent spam.
* **Atomic Revenue Splitter:** Upon a user download transaction, Soroban atomically splits the minimum mandatory fee equally among active serving nodes and routes voluntary tips directly to the creator.
* **Slashing & Reputation:** Malicious nodes distributing corrupted payloads lose their staked XLM.

### Layer 2: P2P Content Delivery (Sidechain / Daemon)
* **Client-Side Encryption:** Assets are encrypted client-side using AES-256-GCM before distribution.
* **Blob Distribution:** Encrypted blobs are replicated across registered nodes.
* **Proof-of-Payment Delivery:** Nodes serve the encrypted payload only upon receiving a cryptographically verifiable transaction proof from the Stellar ledger.

---

## 6. 30-Day Sprint Scope & Deliverables (Focused Scope)

Following evaluator feedback, this sprint focuses on a **single, solid component**: the **Soroban Access & Key Release Engine** (Smart Contract + CLI).

| Week | Milestone / Focus | Concrete Technical Deliverables | Verification Metric |
| :---: | :--- | :--- | :--- |
| **Week 1** | **Soroban Access Registry Contract** | Implement and optimize `contracts/src/lib.rs` with `register_asset`, `purchase_access`, and `KeyReleased` event emission. Unit tests in Rust. Deploy to Soroban Testnet. | Contract ID deployed on Testnet; unit tests passing. |
| **Week 2** | **Cryptographic CLI Client** | Implement `client/` CLI: `stellar-storage encrypt <file>` and `stellar-storage decrypt <hash>`. AES-256-GCM encryption and key package generation. | CLI successfully encrypts a file and registers it on-chain. |
| **Week 3** | **End-to-End Key Release Flow** | Integrate payment in XLM on Testnet, trigger `KeyReleased` event, and complete local decryption. | Full flow: Encrypt → Pay XLM → Release Key → Decrypt verified. |
| **Week 4** | **Documentation, Demo & Open Source** | Publish technical docs, quickstart guide, and a 3-minute video walkthrough. Update README with architecture and comparison. | Public demo video and reproducible test script in repository. |

---

## 7. Budget Allocation ($3,000 USD in XLM)

All funds are dedicated exclusively to core engineering, testing, and infrastructure validation:

* **Smart Contract Engineering & Soroban Integration (45% — $1,350):** Finalizing Soroban Rust contracts, key release logic, security checks, and Testnet deployment.
* **Cryptographic CLI & Client Development (30% — $900):** AES-256-GCM client engine, key package handling, and CLI developer tools.
* **Testnet Infrastructure, QA & Benchmarking (15% — $450):** Testnet setup, RPC connectivity testing, and end-to-end validation.
* **Documentation, Video Demonstration & Open-Source Kit (10% — $300):** Comprehensive documentation, diagrams, and public video demonstration.

---

## 8. Success & Evaluation Criteria

At the conclusion of the 30-day sprint, the project will be evaluated on the following concrete outputs:
1. **Live Testnet Contract:** Verified contract address on Stellar Testnet Explorer.
2. **Functional CLI:** Any developer can run `git clone`, encrypt a file, pay in XLM, and decrypt it via CLI.
3. **Atomic XLM Settlement:** On-chain proof of an XLM payment triggering key release.
4. **Open Source & Reproducibility:** Clean GitHub repository with MIT license and full deployment scripts.

---

## 9. Stellar Chile Chapter Participation

* **GitHub:** [github.com/yerkobits](https://github.com/yerkobits)
* **Community:** Active participation in Stellar Chile Chapter channels (Telegram/Discord) and regional ecosystem events.

---

## 10. Next Steps & Post-Sprint Vision

Upon successful execution of this Instaward sprint, Stellar_Storage will:
1. Present the functioning Testnet MVP to the **Stellar Chile Chapter** and broader Latin American ecosystem.
2. Prepare a full **Stellar Community Fund (SCF) Build Award** application ($15K–$50K) for decentralized identity (DID) integration, browser extension wallet support (Freighter), and WebRTC peer-to-peer data channels.