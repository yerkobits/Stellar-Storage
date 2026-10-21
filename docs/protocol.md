# Especificación del Protocolo StellarVault

## Resumen
StellarVault opera enteramente sobre la red Stellar y Soroban. Todas las transacciones económicas (stakes de publicación, stakes de nodos validadores, recompensas por servicio de almacenamiento y donaciones a creadores) se liquidan de forma atómica en **XLM**.

## Ciclo de Vida de una Descarga
1. El usuario inicia una transacción en Soroban que especifica el `file_hash` y los nodos validadores activos.
2. El contrato inteligente valida el pago en XLM:
   - Distribución proporcional del almacenamiento entre los nodos activos.
   - Envío de donación voluntaria al creador.
3. El contrato emite un evento con un comprobante criptográfico de pago (`x-stellar-proof`).
4. El cliente presenta dicho comprobante al nodo P2P para recibir el blob cifrado.
