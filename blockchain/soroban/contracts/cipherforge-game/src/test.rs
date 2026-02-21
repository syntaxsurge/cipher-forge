#![cfg(test)]

use super::*;
use soroban_sdk::{contract, contractimpl, contracttype, testutils::Address as _, Address, Bytes, Env};

#[contracttype]
#[derive(Clone)]
enum HubDataKey {
    LastStartSession,
    LastEndSession,
    LastEndWinner,
}

#[contract]
struct MockHub;

#[contractimpl]
impl MockHub {
    pub fn start_game(
        env: Env,
        _game_id: Address,
        session_id: u32,
        _player1: Address,
        _player2: Address,
        _player1_points: i128,
        _player2_points: i128,
    ) {
        env.storage()
            .instance()
            .set(&HubDataKey::LastStartSession, &session_id);
    }

    pub fn end_game(env: Env, session_id: u32, player1_won: bool) {
        env.storage()
            .instance()
            .set(&HubDataKey::LastEndSession, &session_id);
        env.storage()
            .instance()
            .set(&HubDataKey::LastEndWinner, &player1_won);
    }

    pub fn last_start_session(env: Env) -> Option<u32> {
        env.storage().instance().get(&HubDataKey::LastStartSession)
    }

    pub fn last_end_session(env: Env) -> Option<u32> {
        env.storage().instance().get(&HubDataKey::LastEndSession)
    }

    pub fn last_end_winner(env: Env) -> Option<bool> {
        env.storage().instance().get(&HubDataKey::LastEndWinner)
    }
}

#[contracttype]
#[derive(Clone)]
enum VerifierDataKey {
    ShouldFail,
}

#[contract]
struct MockVerifier;

#[contractimpl]
impl MockVerifier {
    pub fn verify_proof(
        env: Env,
        _public_inputs: Bytes,
        _proof_bytes: Bytes,
    ) -> Result<(), VerifierError> {
        if env
            .storage()
            .instance()
            .get::<VerifierDataKey, bool>(&VerifierDataKey::ShouldFail)
            .unwrap_or(false)
        {
            return Err(VerifierError::VerificationFailed);
        }

        Ok(())
    }

    pub fn set_should_fail(env: Env, should_fail: bool) {
        env.storage()
            .instance()
            .set(&VerifierDataKey::ShouldFail, &should_fail);
    }
}

#[test]
fn create_session_and_submit_proof_calls_hub_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    let hub_id = env.register(MockHub, ());
    let verifier_id = env.register(MockVerifier, ());
    let game_id = env.register(
        CipherForgeGame,
        (admin.clone(), hub_id.clone(), verifier_id.clone()),
    );

    let game_client = CipherForgeGameClient::new(&env, &game_id);
    let hub_client = MockHubClient::new(&env, &hub_id);

    let session_id = game_client.create_session(&player1, &player2);
    assert_eq!(session_id, 1);
    assert_eq!(hub_client.last_start_session(), Some(1));

    let public_inputs = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let proof_bytes = Bytes::from_slice(&env, &[9, 8, 7, 6]);
    game_client.submit_proof(&session_id, &public_inputs, &proof_bytes);

    let updated = game_client.get_session(&session_id);
    assert!(updated.settled);
    assert!(!updated.player1_won);
    assert_eq!(hub_client.last_end_session(), Some(1));
    assert_eq!(hub_client.last_end_winner(), Some(false));
}

#[test]
fn failed_verification_keeps_session_open() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    let hub_id = env.register(MockHub, ());
    let verifier_id = env.register(MockVerifier, ());
    let game_id = env.register(
        CipherForgeGame,
        (admin.clone(), hub_id.clone(), verifier_id.clone()),
    );

    let game_client = CipherForgeGameClient::new(&env, &game_id);
    let hub_client = MockHubClient::new(&env, &hub_id);
    let verifier_client = MockVerifierClient::new(&env, &verifier_id);

    let session_id = game_client.create_session(&player1, &player2);
    verifier_client.set_should_fail(&true);

    let public_inputs = Bytes::from_slice(&env, &[1, 2, 3, 4]);
    let proof_bytes = Bytes::from_slice(&env, &[9, 8, 7, 6]);

    let result = env.as_contract(&game_id, || {
        CipherForgeGame::submit_proof(
            env.clone(),
            session_id,
            public_inputs.clone(),
            proof_bytes.clone(),
        )
    });
    assert_eq!(result, Err(Error::ZkVerificationFailed));

    let session = game_client.get_session(&session_id);
    assert!(!session.settled);
    assert_eq!(hub_client.last_end_session(), None);
}
