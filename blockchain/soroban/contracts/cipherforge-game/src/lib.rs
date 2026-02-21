#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, Address, Bytes, Env,
};

#[contractclient(name = "GameHubClient")]
pub trait GameHub {
    fn start_game(
        env: Env,
        game_id: Address,
        session_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
    );

    fn end_game(env: Env, session_id: u32, player1_won: bool);
}

#[contractclient(name = "UltraHonkVerifierClient")]
pub trait UltraHonkVerifier {
    fn verify_proof(env: Env, public_inputs: Bytes, proof_bytes: Bytes)
        -> Result<(), VerifierError>;
}

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum VerifierError {
    VkParseError = 1,
    ProofParseError = 2,
    VerificationFailed = 3,
    VkNotSet = 4,
}

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    SessionNotFound = 3,
    SessionAlreadySettled = 4,
    CounterOverflow = 5,
    ZkVerificationFailed = 6,
    DuplicatePlayers = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Initialized,
    Admin,
    Hub,
    Verifier,
    NextSessionId,
    Session(u32),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Session {
    pub player1: Address,
    pub player2: Address,
    pub settled: bool,
    pub player1_won: bool,
    pub created_at: u64,
    pub ended_at: u64,
}

#[contract]
pub struct CipherForgeGame;

#[contractimpl]
impl CipherForgeGame {
    pub fn __constructor(
        env: Env,
        admin: Address,
        hub_contract: Address,
        verifier_contract: Address,
    ) -> Result<(), Error> {
        if Self::is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Hub, &hub_contract);
        env.storage().instance().set(&DataKey::Verifier, &verifier_contract);
        env.storage().instance().set(&DataKey::NextSessionId, &1u32);
        env.storage().instance().set(&DataKey::Initialized, &true);
        Ok(())
    }

    pub fn set_verifier(env: Env, verifier_contract: Address) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        let admin = Self::admin(&env)?;
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Verifier, &verifier_contract);
        Ok(())
    }

    pub fn set_hub(env: Env, hub_contract: Address) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        let admin = Self::admin(&env)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Hub, &hub_contract);
        Ok(())
    }

    pub fn create_session(env: Env, player1: Address, player2: Address) -> Result<u32, Error> {
        Self::require_initialized(&env)?;

        if player1 == player2 {
            return Err(Error::DuplicatePlayers);
        }

        player2.require_auth();

        let current_session_id = env
            .storage()
            .instance()
            .get::<DataKey, u32>(&DataKey::NextSessionId)
            .unwrap_or(1);
        let next_session_id = current_session_id
            .checked_add(1)
            .ok_or(Error::CounterOverflow)?;
        env.storage()
            .instance()
            .set(&DataKey::NextSessionId, &next_session_id);

        let session = Session {
            player1: player1.clone(),
            player2: player2.clone(),
            settled: false,
            player1_won: false,
            created_at: env.ledger().timestamp(),
            ended_at: 0,
        };
        env.storage()
            .instance()
            .set(&DataKey::Session(current_session_id), &session);

        let game_hub_client = GameHubClient::new(&env, &Self::hub(&env)?);
        game_hub_client.start_game(
            &env.current_contract_address(),
            &current_session_id,
            &player1,
            &player2,
            &0i128,
            &0i128,
        );

        Ok(current_session_id)
    }

    pub fn submit_proof(
        env: Env,
        session_id: u32,
        public_inputs: Bytes,
        proof_bytes: Bytes,
    ) -> Result<(), Error> {
        Self::require_initialized(&env)?;

        let mut session = Self::session(&env, session_id)?;
        if session.settled {
            return Err(Error::SessionAlreadySettled);
        }

        session.player2.require_auth();

        let verifier_client = UltraHonkVerifierClient::new(&env, &Self::verifier(&env)?);
        match verifier_client.try_verify_proof(&public_inputs, &proof_bytes) {
            Ok(Ok(())) => {}
            _ => {
                return Err(Error::ZkVerificationFailed);
            }
        }

        session.settled = true;
        session.player1_won = false;
        session.ended_at = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::Session(session_id), &session);

        let game_hub_client = GameHubClient::new(&env, &Self::hub(&env)?);
        game_hub_client.end_game(&session_id, &false);

        Ok(())
    }

    pub fn resolve_timeout(env: Env, session_id: u32, player1_won: bool) -> Result<(), Error> {
        Self::require_initialized(&env)?;

        let admin = Self::admin(&env)?;
        admin.require_auth();

        let mut session = Self::session(&env, session_id)?;
        if session.settled {
            return Err(Error::SessionAlreadySettled);
        }

        session.settled = true;
        session.player1_won = player1_won;
        session.ended_at = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::Session(session_id), &session);

        let game_hub_client = GameHubClient::new(&env, &Self::hub(&env)?);
        game_hub_client.end_game(&session_id, &player1_won);
        Ok(())
    }

    pub fn get_session(env: Env, session_id: u32) -> Result<Session, Error> {
        Self::require_initialized(&env)?;
        Self::session(&env, session_id)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        Self::require_initialized(&env)?;
        Self::admin(&env)
    }

    pub fn get_hub(env: Env) -> Result<Address, Error> {
        Self::require_initialized(&env)?;
        Self::hub(&env)
    }

    pub fn get_verifier(env: Env) -> Result<Address, Error> {
        Self::require_initialized(&env)?;
        Self::verifier(&env)
    }

    fn is_initialized(env: &Env) -> bool {
        env.storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::Initialized)
            .unwrap_or(false)
    }

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !Self::is_initialized(env) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn session(env: &Env, session_id: u32) -> Result<Session, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Session>(&DataKey::Session(session_id))
            .ok_or(Error::SessionNotFound)
    }

    fn admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn hub(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::Hub)
            .ok_or(Error::NotInitialized)
    }

    fn verifier(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::Verifier)
            .ok_or(Error::NotInitialized)
    }
}

#[cfg(test)]
mod test;
