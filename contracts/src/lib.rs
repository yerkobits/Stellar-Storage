#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Bytes,
    BytesN, Env, String,
};

/// Default timeout in ledgers before an unfulfilled escrow can be refunded (~24h at ~5s/ledger)
pub const DEFAULT_RELEASE_TIMEOUT_LEDGERS: u32 = 17_280;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum StorageError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    AssetAlreadyExists = 3,
    AssetNotFound = 4,
    AssetInactive = 5,
    InvalidPrice = 6,
    AccessAlreadyRequested = 7,
    AccessNotFound = 8,
    InvalidAccessState = 9,
    TimeoutNotReached = 10,
    Unauthorized = 11,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccessStatus {
    Escrowed = 0,
    Released = 1,
    Refunded = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetRecord {
    pub author: Address,
    pub asset_hash: BytesN<32>,
    pub key_commitment: BytesN<32>,
    pub price_xlm: i128,
    pub content_uri: String,
    pub active: bool,
    pub total_sales: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccessRecord {
    pub buyer: Address,
    pub asset_hash: BytesN<32>,
    pub buyer_pubkey: BytesN<32>,
    pub escrowed_xlm: i128,
    pub expiry_ledger: u32,
    pub status: AccessStatus,
    pub wrapped_key: Bytes,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    XlmToken,
    TimeoutLedgers,
    Asset(BytesN<32>),
    Access(BytesN<32>, Address),
}

#[contract]
pub struct StellarStorageContract;

#[contractimpl]
impl StellarStorageContract {
    /// Initializes the contract with an admin address and the native XLM Stellar Asset Contract (SAC) address.
    pub fn initialize(
        env: Env,
        admin: Address,
        xlm_token: Address,
        timeout_ledgers: Option<u32>,
    ) -> Result<(), StorageError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(StorageError::AlreadyInitialized);
        }
        admin.require_auth();

        let timeout = timeout_ledgers.unwrap_or(DEFAULT_RELEASE_TIMEOUT_LEDGERS);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage()
            .instance()
            .set(&DataKey::TimeoutLedgers, &timeout);

        Ok(())
    }

    /// Registers an encrypted asset on-chain with its SHA-256 hash, key commitment SHA-256(K_AES),
    /// native XLM price (in stroops), and off-chain encrypted blob URI.
    pub fn register_asset(
        env: Env,
        author: Address,
        asset_hash: BytesN<32>,
        key_commitment: BytesN<32>,
        price_xlm: i128,
        content_uri: String,
    ) -> Result<(), StorageError> {
        author.require_auth();

        if price_xlm < 0 {
            return Err(StorageError::InvalidPrice);
        }

        let key = DataKey::Asset(asset_hash.clone());
        if env.storage().persistent().has(&key) {
            return Err(StorageError::AssetAlreadyExists);
        }

        let record = AssetRecord {
            author: author.clone(),
            asset_hash: asset_hash.clone(),
            key_commitment: key_commitment.clone(),
            price_xlm,
            content_uri,
            active: true,
            total_sales: 0,
        };

        env.storage().persistent().set(&key, &record);
        env.events().publish(
            (symbol_short!("asset_reg"), asset_hash),
            (author, key_commitment, price_xlm),
        );

        Ok(())
    }

    /// Updates an asset's active status or price (author only).
    pub fn set_asset_status(
        env: Env,
        author: Address,
        asset_hash: BytesN<32>,
        active: bool,
        new_price_xlm: Option<i128>,
    ) -> Result<(), StorageError> {
        author.require_auth();

        let key = DataKey::Asset(asset_hash.clone());
        let mut record: AssetRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(StorageError::AssetNotFound)?;

        if record.author != author {
            return Err(StorageError::Unauthorized);
        }

        if let Some(price) = new_price_xlm {
            if price < 0 {
                return Err(StorageError::InvalidPrice);
            }
            record.price_xlm = price;
        }
        record.active = active;

        env.storage().persistent().set(&key, &record);
        Ok(())
    }

    /// Buyer escrows XLM in the contract and submits their ephemeral X25519 public key
    /// to request encrypted key delivery.
    pub fn request_access(
        env: Env,
        buyer: Address,
        asset_hash: BytesN<32>,
        buyer_pubkey: BytesN<32>,
    ) -> Result<(), StorageError> {
        buyer.require_auth();

        let xlm_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::XlmToken)
            .ok_or(StorageError::NotInitialized)?;
        let timeout_ledgers: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TimeoutLedgers)
            .unwrap_or(DEFAULT_RELEASE_TIMEOUT_LEDGERS);

        let asset_key = DataKey::Asset(asset_hash.clone());
        let asset: AssetRecord = env
            .storage()
            .persistent()
            .get(&asset_key)
            .ok_or(StorageError::AssetNotFound)?;

        if !asset.active {
            return Err(StorageError::AssetInactive);
        }

        let access_key = DataKey::Access(asset_hash.clone(), buyer.clone());
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<DataKey, AccessRecord>(&access_key)
        {
            if existing.status != AccessStatus::Refunded {
                return Err(StorageError::AccessAlreadyRequested);
            }
        }

        if asset.price_xlm > 0 {
            let xlm_client = token::Client::new(&env, &xlm_token);
            xlm_client.transfer(&buyer, &env.current_contract_address(), &asset.price_xlm);
        }

        let expiry_ledger = env.ledger().sequence() + timeout_ledgers;
        let access = AccessRecord {
            buyer: buyer.clone(),
            asset_hash: asset_hash.clone(),
            buyer_pubkey: buyer_pubkey.clone(),
            escrowed_xlm: asset.price_xlm,
            expiry_ledger,
            status: AccessStatus::Escrowed,
            wrapped_key: Bytes::new(&env),
        };

        env.storage().persistent().set(&access_key, &access);
        env.events().publish(
            (symbol_short!("acc_req"), asset_hash, buyer),
            (buyer_pubkey, asset.price_xlm, expiry_ledger),
        );

        Ok(())
    }

    /// Author releases the ECDH-wrapped AES key package for the buyer and atomically claims the escrowed XLM.
    pub fn release_key(
        env: Env,
        author: Address,
        asset_hash: BytesN<32>,
        buyer: Address,
        wrapped_key: Bytes,
    ) -> Result<(), StorageError> {
        author.require_auth();

        let xlm_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::XlmToken)
            .ok_or(StorageError::NotInitialized)?;

        let asset_key = DataKey::Asset(asset_hash.clone());
        let mut asset: AssetRecord = env
            .storage()
            .persistent()
            .get(&asset_key)
            .ok_or(StorageError::AssetNotFound)?;

        if asset.author != author {
            return Err(StorageError::Unauthorized);
        }

        let access_key = DataKey::Access(asset_hash.clone(), buyer.clone());
        let mut access: AccessRecord = env
            .storage()
            .persistent()
            .get(&access_key)
            .ok_or(StorageError::AccessNotFound)?;

        if access.status != AccessStatus::Escrowed {
            return Err(StorageError::InvalidAccessState);
        }

        if access.escrowed_xlm > 0 {
            let xlm_client = token::Client::new(&env, &xlm_token);
            xlm_client.transfer(
                &env.current_contract_address(),
                &asset.author,
                &access.escrowed_xlm,
            );
        }

        access.status = AccessStatus::Released;
        access.wrapped_key = wrapped_key.clone();
        asset.total_sales += 1;

        env.storage().persistent().set(&access_key, &access);
        env.storage().persistent().set(&asset_key, &asset);

        env.events().publish(
            (symbol_short!("key_rel"), asset_hash, buyer),
            wrapped_key,
        );

        Ok(())
    }

    /// Refunds escrowed XLM back to the buyer if the author fails to release the key before expiry_ledger.
    pub fn refund_expired(
        env: Env,
        buyer: Address,
        asset_hash: BytesN<32>,
    ) -> Result<(), StorageError> {
        buyer.require_auth();

        let xlm_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::XlmToken)
            .ok_or(StorageError::NotInitialized)?;

        let access_key = DataKey::Access(asset_hash.clone(), buyer.clone());
        let mut access: AccessRecord = env
            .storage()
            .persistent()
            .get(&access_key)
            .ok_or(StorageError::AccessNotFound)?;

        if access.status != AccessStatus::Escrowed {
            return Err(StorageError::InvalidAccessState);
        }

        if env.ledger().sequence() < access.expiry_ledger {
            return Err(StorageError::TimeoutNotReached);
        }

        if access.escrowed_xlm > 0 {
            let xlm_client = token::Client::new(&env, &xlm_token);
            xlm_client.transfer(
                &env.current_contract_address(),
                &buyer,
                &access.escrowed_xlm,
            );
        }

        access.status = AccessStatus::Refunded;
        env.storage().persistent().set(&access_key, &access);

        env.events().publish(
            (symbol_short!("esc_ref"), asset_hash, buyer),
            access.escrowed_xlm,
        );

        Ok(())
    }

    /// Read-only helper to fetch registered asset metadata.
    pub fn get_asset(env: Env, asset_hash: BytesN<32>) -> Result<AssetRecord, StorageError> {
        env.storage()
            .persistent()
            .get(&DataKey::Asset(asset_hash))
            .ok_or(StorageError::AssetNotFound)
    }

    /// Read-only helper to fetch buyer access record and released wrapped key.
    pub fn get_access(
        env: Env,
        asset_hash: BytesN<32>,
        buyer: Address,
    ) -> Result<AccessRecord, StorageError> {
        env.storage()
            .persistent()
            .get(&DataKey::Access(asset_hash, buyer))
            .ok_or(StorageError::AccessNotFound)
    }
}

#[cfg(test)]
mod test;
