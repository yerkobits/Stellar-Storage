#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Bytes, BytesN, Env, String};

fn setup_env() -> (
    Env,
    StellarStorageContractClient<'static>,
    Address,
    StellarAssetClient<'static>,
    TokenClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let xlm_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(xlm_admin);
    let xlm_addr = sac.address();
    let xlm_sac = StellarAssetClient::new(&env, &xlm_addr);
    let xlm_client = TokenClient::new(&env, &xlm_addr);

    let contract_id = env.register(StellarStorageContract, ());
    let client = StellarStorageContractClient::new(&env, &contract_id);

    let contract_admin = Address::generate(&env);
    client.initialize(&contract_admin, &xlm_addr, &Some(100));

    (env, client, contract_id, xlm_sac, xlm_client)
}

#[test]
fn test_register_escrow_and_atomic_key_release() {
    let (env, client, contract_id, xlm_sac, xlm_client) = setup_env();

    let author = Address::generate(&env);
    let buyer = Address::generate(&env);
    xlm_sac.mint(&buyer, &500_000_000); // 50 XLM

    let asset_hash = BytesN::from_array(&env, &[0x11; 32]);
    let key_commitment = BytesN::from_array(&env, &[0x22; 32]);
    let price_xlm: i128 = 100_000_000; // 10 XLM
    let uri = String::from_str(&env, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi");

    // 1. Author registers encrypted asset
    client.register_asset(&author, &asset_hash, &key_commitment, &price_xlm, &uri);

    let stored_asset = client.get_asset(&asset_hash);
    assert_eq!(stored_asset.author, author);
    assert_eq!(stored_asset.price_xlm, price_xlm);
    assert_eq!(stored_asset.total_sales, 0);

    // 2. Buyer requests access and escrows 10 XLM
    let buyer_pubkey = BytesN::from_array(&env, &[0x33; 32]);
    client.request_access(&buyer, &asset_hash, &buyer_pubkey);

    assert_eq!(xlm_client.balance(&buyer), 400_000_000);
    assert_eq!(xlm_client.balance(&contract_id), 100_000_000);

    // 3. Author releases ECDH-wrapped key and atomically receives 10 XLM
    let wrapped_key = Bytes::from_slice(&env, b"x25519_ephem_pub+nonce+ciphertext");
    client.release_key(&author, &asset_hash, &buyer, &wrapped_key);

    assert_eq!(xlm_client.balance(&contract_id), 0);
    assert_eq!(xlm_client.balance(&author), 100_000_000);

    let access = client.get_access(&asset_hash, &buyer);
    assert_eq!(access.status, AccessStatus::Released);
    assert_eq!(access.wrapped_key, wrapped_key);

    let updated_asset = client.get_asset(&asset_hash);
    assert_eq!(updated_asset.total_sales, 1);
}

#[test]
fn test_escrow_refund_after_timeout() {
    let (env, client, contract_id, xlm_sac, xlm_client) = setup_env();

    let author = Address::generate(&env);
    let buyer = Address::generate(&env);
    xlm_sac.mint(&buyer, &200_000_000); // 20 XLM

    let asset_hash = BytesN::from_array(&env, &[0xAA; 32]);
    let key_commitment = BytesN::from_array(&env, &[0xBB; 32]);
    let uri = String::from_str(&env, "ipfs://QmTestTimeoutAsset");

    client.register_asset(&author, &asset_hash, &key_commitment, &150_000_000, &uri);

    let buyer_pubkey = BytesN::from_array(&env, &[0xCC; 32]);
    client.request_access(&buyer, &asset_hash, &buyer_pubkey);
    assert_eq!(xlm_client.balance(&buyer), 50_000_000);
    assert_eq!(xlm_client.balance(&contract_id), 150_000_000);

    // Attempting refund before timeout must fail
    let early_res = client.try_refund_expired(&buyer, &asset_hash);
    assert!(early_res.is_err());

    // Advance ledger sequence past timeout (100 ledgers configured in setup)
    env.ledger().with_mut(|li| {
        li.sequence_number += 105;
    });

    // Buyer reclaims escrowed XLM
    client.refund_expired(&buyer, &asset_hash);
    assert_eq!(xlm_client.balance(&buyer), 200_000_000);
    assert_eq!(xlm_client.balance(&contract_id), 0);
    assert_eq!(xlm_client.balance(&author), 0);

    let access = client.get_access(&asset_hash, &buyer);
    assert_eq!(access.status, AccessStatus::Refunded);
}

#[test]
fn test_unauthorized_release_rejected() {
    let (env, client, _contract_id, xlm_sac, _xlm_client) = setup_env();

    let author = Address::generate(&env);
    let attacker = Address::generate(&env);
    let buyer = Address::generate(&env);
    xlm_sac.mint(&buyer, &100_000_000);

    let asset_hash = BytesN::from_array(&env, &[0x55; 32]);
    let key_commitment = BytesN::from_array(&env, &[0x66; 32]);
    let uri = String::from_str(&env, "ipfs://QmAuthCheck");

    client.register_asset(&author, &asset_hash, &key_commitment, &50_000_000, &uri);
    client.request_access(&buyer, &asset_hash, &BytesN::from_array(&env, &[0x77; 32]));

    let fake_key = Bytes::from_slice(&env, b"fake");
    let res = client.try_release_key(&attacker, &asset_hash, &buyer, &fake_key);
    assert!(res.is_err());
}
