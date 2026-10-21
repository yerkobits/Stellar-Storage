# StellarVault 🛡️📦

**Capa de Almacenamiento Descentralizado y Monetizable sobre Stellar Network**

StellarVault es una infraestructura de almacenamiento de archivos cifrados (papers, multimedia, recursos de alta valoración) impulsada por contratos inteligentes en **Soroban (L1 de Stellar)** y una red P2P de nodos independientes. Está diseñada específicamente para garantizar la remuneración justa a creadores y nodos validadores, desincentivando la piratería, los ataques Sybil y el spam malicioso mediante incentivos económicos directos en **XLM**.

---

## 🌟 Características Principales

*   **Cifrado y Privacidad:** Los archivos se almacenan en la red P2P como blobs cifrados. Cada descarga requiere una clave de descifrado individual gestionada de forma atómica.
*   **Modelo Económico basado en XLM:** Sin tokens de utilidad intermediarios; todo el gas, stakes y repartos de donaciones se ejecutan directamente en **XLM**.
*   **Anti-Piratería Estructural:** Las copias no autorizadas no pueden integrarse al protocolo de nodos validados, por lo que la piratería externa carece de incentivos económicos.
*   **Resistencia a Sybil y Spam:** Integración de *Stakes* económicos obligatorios tanto para creadores como para nodos, combinados con identidades rastreables y reputación en cadena.

---

## 🏗️ Arquitectura del Sistema

La arquitectura es un modelo híbrido optimizado:
1.  **Capa de Consenso y Liquidación (Soroban L1):** Contratos inteligentes que gestionan los registros de autoría, identidades de nodos, los *stakes*, y la distribución automática de pagos en XLM.
2.  **Capa P2P de Almacenamiento (Sidechain):** Red de nodos distribuidos que almacenan y sirven los bloques cifrados de los archivos.

```
+-------------------------------------------------------------+
|                     Usuario / Comprador                     |
+------------------------------+------------------------------+
                               |
                        Paga en XLM (L1)
                               v
+-------------------------------------------------------------+
|                Soroban Smart Contracts (L1)                 |
|  - Verifica descarga    - Distribuye Donación Mínima (Nodos) |
|  - Valida Autoría       - Envía Donación Voluntaria (Autor) |
+------------------------------+------------------------------+
                               |
              Libera Clave de Descifrado Individual
                               v
+-------------------------------------------------------------+
|                  Red P2P de Nodos (Storage)                 |
|  - Sirve el archivo cifrado único                           |
|  - Nodos activos reciben su porción de XLM al instante      |
+-------------------------------------------------------------+
```

---

## 💰 Modelo de Negocio y Flujo de Donaciones

Cuando un usuario solicita la descarga de un archivo, realiza una transacción unificada que se divide automáticamente en el Smart Contract:

1.  **Donación Mínima Obligatoria:** Se reparte matemáticamente entre **todos los nodos que están sirviendo activamente el archivo** en ese milisegundo. Si un nodo está apagado o no posee el archivo, no recibe nada.
2.  **Donación Voluntaria:** Va destinada íntegramente al creador del contenido como reconocimiento a su obra.

---

## 🛡️ Mitigación de Malas Prácticas y Seguridad

### 1. Ataques Sybil (Miles de nodos falsos de un mismo actor)
*   **Garantía de Nodo (Node Stake):** Todo nodo que desee servir archivos debe bloquear un depósito en XLM en el contrato inteligente. Crear miles de nodos falsos se vuelve económicamente inviable.
*   **Prueba de Copia Única (PoUC):** El protocolo limita y audita criptográficamente las copias que almacena cada nodo para evitar la saturación artificial de los repartos de donaciones.

### 2. Spam y Archivos Maliciosos
*   **Stake de Publicación:** El creador debe depositar un pequeño stake en XLM para subir un archivo. Si la comunidad reporta el archivo como spam masivo, el stake se confisca.
*   **Identidad de Nodos y Slashing:** Los nodos no son anónimos; operan con una identidad verificable en la red de Stellar. Si un nodo distribuye malware, su identidad es penalizada y su *Node Stake* es confiscado (*slashing*).
*   **Consenso de Borrado:** Si un archivo es catalogado como censurable o malicioso, los nodos dejan de servirlo de forma coordinada, haciendo que desaparezca de la red de manera orgánica.

### 3. Protección contra Re-subidas Falsas
*   El contrato inteligente de Soroban almacena el hash criptográfico y la firma digital del creador original. Es imposible que un tercero registre un archivo existente como propio.

---

## 📁 Estructura del Repositorio

```text
StellarVault/
├── contracts/          # Smart contracts en Rust para Soroban (L1)
├── node/               # Daemon P2P para los nodos de almacenamiento
├── client/             # SDK / CLI para creadores y usuarios finales
├── docs/               # Documentación técnica y especificaciones del protocolo
└── scripts/            # Scripts de despliegue, pruebas y diagnóstico
```

---

## 🚀 Primeros Pasos (Desarrollo)

Próximamente se añadirán las guías de instalación para levantar un nodo de almacenamiento local y desplegar los contratos en la testnet de Stellar.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.
