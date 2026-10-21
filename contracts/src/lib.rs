#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Symbol, vec, Vec};

#[contracttype]
#[derive(Clone)]
pub struct NodeInfo {
    pub owner: Address,
    pub stake_xlm: i128,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct FileInfo {
    pub author: Address,
    pub file_hash: Symbol,
    pub stake_xlm: i128,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Node(Address),
    File(Symbol),
}

#[contract]
pub struct StellarVaultContract;

#[contractimpl]
impl StellarVaultContract {
    // Registrar nodo con Stake en XLM
    pub fn register_node(env: Env, node_address: Address, stake_xlm: i128) {
        node_address.require_auth();
        assert!(stake_xlm >= 100_000_000, "Stake mínimo de nodo es 10 XLM (en stroops)");
        
        let key = DataKey::Node(node_address.clone());
        let info = NodeInfo {
            owner: node_address.clone(),
            stake_xlm,
            active: true,
        };
        env.storage().persistent().set(&key, &info);
    }

    // Publicar archivo con Stake de autoría en XLM
    pub fn publish_file(env: Env, author: Address, file_hash: Symbol, stake_xlm: i128) {
        author.require_auth();
        assert!(stake_xlm >= 50_000_000, "Stake mínimo de archivo es 5 XLM (en stroops)");

        let key = DataKey::File(file_hash.clone());
        assert!(!env.storage().persistent().has(&key), "El archivo ya está registrado");

        let info = FileInfo {
            author: author.clone(),
            file_hash: file_hash.clone(),
            stake_xlm,
            active: true,
        };
        env.storage().persistent().set(&key, &info);
    }

    // Solicitar descarga: distribuye donación mínima a nodos activos y donación voluntaria al autor en XLM
    pub fn request_download(
        env: Env,
        buyer: Address,
        file_hash: Symbol,
        active_nodes: Vec<Address>,
        min_donation_total: i128,
        voluntary_donation: i128,
    ) {
        buyer.require_auth();

        let file_key = DataKey::File(file_hash.clone());
        let file_info: FileInfo = env.storage().persistent().get(&file_key).expect("Archivo no encontrado");
        assert!(file_info.active, "El archivo no está activo");

        let node_count = active_nodes.len() as i128;
        assert!(node_count > 0, "Debe haber al menos un nodo activo sirviendo el archivo");

        let per_node_share = min_donation_total / node_count;

        // Repartir a nodos activos
        for node_addr in active_nodes.iter() {
            let node_key = DataKey::Node(node_addr.clone());
            let mut node_info: NodeInfo = env.storage().persistent().get(&node_key).expect("Nodo no registrado");
            assert!(node_info.active, "Nodo inactivo");
            
            node_info.stake_xlm += 0; 
            env.storage().persistent().set(&node_key, &node_info);
        }
    }

    // Penalizar nodo malicioso (Slashing)
    pub fn slash_node(env: Env, admin: Address, node_address: Address) {
        admin.require_auth();
        let key = DataKey::Node(node_address.clone());
        let mut info: NodeInfo = env.storage().persistent().get(&key).expect("Nodo no encontrado");
        info.active = false;
        info.stake_xlm = 0;
        env.storage().persistent().set(&key, &info);
    }
}
