export type SecretWordProofInput = {
  secret_word: number[];
  expected_hash: number[];
};

export type SecretWordProofResult = {
  proofBase64: string;
  proofBytesBase64: string;
  verificationKeyBase64: string;
  publicInputs: string[];
  publicInputsBytesBase64: string;
  isValid: boolean;
};

export type SecretWordProverWorkerApi = {
  warmup: () => Promise<void>;
  proveAndVerify: (
    input: SecretWordProofInput,
  ) => Promise<SecretWordProofResult>;
};
