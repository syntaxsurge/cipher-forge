import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBBI3DCMFF23CYKWHN3624CAD6C6UUWIZLQEU2MJ5UFHM2ADK344OBGZ",
  }
} as const

export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"SessionNotFound"},
  4: {message:"SessionAlreadySettled"},
  5: {message:"CounterOverflow"},
  6: {message:"ZkVerificationFailed"},
  7: {message:"DuplicatePlayers"}
}

export type DataKey = {tag: "Initialized", values: void} | {tag: "Admin", values: void} | {tag: "Hub", values: void} | {tag: "Verifier", values: void} | {tag: "NextSessionId", values: void} | {tag: "Session", values: readonly [u32]};


export interface Session {
  created_at: u64;
  ended_at: u64;
  player1: string;
  player1_won: boolean;
  player2: string;
  settled: boolean;
}

export const VerifierError = {
  1: {message:"VkParseError"},
  2: {message:"ProofParseError"},
  3: {message:"VerificationFailed"},
  4: {message:"VkNotSet"}
}

export interface Client {
  /**
   * Construct and simulate a get_hub transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_hub: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a set_hub transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_hub: ({hub_contract}: {hub_contract: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_session transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_session: ({session_id}: {session_id: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<Session>>>

  /**
   * Construct and simulate a get_verifier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_verifier: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a set_verifier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_verifier: ({verifier_contract}: {verifier_contract: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a submit_proof transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  submit_proof: ({session_id, public_inputs, proof_bytes}: {session_id: u32, public_inputs: Buffer, proof_bytes: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_session transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_session: ({player1, player2}: {player1: string, player2: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a resolve_timeout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  resolve_timeout: ({session_id, player1_won}: {session_id: u32, player1_won: boolean}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, hub_contract, verifier_contract}: {admin: string, hub_contract: string, verifier_contract: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, hub_contract, verifier_contract}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABwAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAAPU2Vzc2lvbk5vdEZvdW5kAAAAAAMAAAAAAAAAFVNlc3Npb25BbHJlYWR5U2V0dGxlZAAAAAAAAAQAAAAAAAAAD0NvdW50ZXJPdmVyZmxvdwAAAAAFAAAAAAAAABRaa1ZlcmlmaWNhdGlvbkZhaWxlZAAAAAYAAAAAAAAAEER1cGxpY2F0ZVBsYXllcnMAAAAH",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAAC0luaXRpYWxpemVkAAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAADSHViAAAAAAAAAAAAAAAACFZlcmlmaWVyAAAAAAAAAAAAAAANTmV4dFNlc3Npb25JZAAAAAAAAAEAAAAAAAAAB1Nlc3Npb24AAAAAAQAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAAB1Nlc3Npb24AAAAABgAAAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAAAAAAAAIZW5kZWRfYXQAAAAGAAAAAAAAAAdwbGF5ZXIxAAAAABMAAAAAAAAAC3BsYXllcjFfd29uAAAAAAEAAAAAAAAAB3BsYXllcjIAAAAAEwAAAAAAAAAHc2V0dGxlZAAAAAAB",
        "AAAABAAAAAAAAAAAAAAADVZlcmlmaWVyRXJyb3IAAAAAAAAEAAAAAAAAAAxWa1BhcnNlRXJyb3IAAAABAAAAAAAAAA9Qcm9vZlBhcnNlRXJyb3IAAAAAAgAAAAAAAAASVmVyaWZpY2F0aW9uRmFpbGVkAAAAAAADAAAAAAAAAAhWa05vdFNldAAAAAQ=",
        "AAAAAAAAAAAAAAAHZ2V0X2h1YgAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAAAAAAAHc2V0X2h1YgAAAAABAAAAAAAAAAxodWJfY29udHJhY3QAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAALZ2V0X3Nlc3Npb24AAAAAAQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAEAAAPpAAAH0AAAAAdTZXNzaW9uAAAAAAM=",
        "AAAAAAAAAAAAAAAMZ2V0X3ZlcmlmaWVyAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAAMc2V0X3ZlcmlmaWVyAAAAAQAAAAAAAAARdmVyaWZpZXJfY29udHJhY3QAAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAMc3VibWl0X3Byb29mAAAAAwAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAANcHVibGljX2lucHV0cwAAAAAAAA4AAAAAAAAAC3Byb29mX2J5dGVzAAAAAA4AAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMaHViX2NvbnRyYWN0AAAAEwAAAAAAAAARdmVyaWZpZXJfY29udHJhY3QAAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAOY3JlYXRlX3Nlc3Npb24AAAAAAAIAAAAAAAAAB3BsYXllcjEAAAAAEwAAAAAAAAAHcGxheWVyMgAAAAATAAAAAQAAA+kAAAAEAAAAAw==",
        "AAAAAAAAAAAAAAAPcmVzb2x2ZV90aW1lb3V0AAAAAAIAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAAAAAAAC3BsYXllcjFfd29uAAAAAAEAAAABAAAD6QAAA+0AAAAAAAAAAw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_hub: this.txFromJSON<Result<string>>,
        set_hub: this.txFromJSON<Result<void>>,
        get_admin: this.txFromJSON<Result<string>>,
        get_session: this.txFromJSON<Result<Session>>,
        get_verifier: this.txFromJSON<Result<string>>,
        set_verifier: this.txFromJSON<Result<void>>,
        submit_proof: this.txFromJSON<Result<void>>,
        create_session: this.txFromJSON<Result<u32>>,
        resolve_timeout: this.txFromJSON<Result<void>>
  }
}