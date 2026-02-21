import { expose } from "comlink";
import {
  proveAndVerifySecretWord,
  warmupSecretWordProverRuntime,
} from "@/features/zk/services/secretWordProverRuntime";
import type {
  SecretWordProverWorkerApi,
} from "@/features/zk/types";

const workerApi: SecretWordProverWorkerApi = {
  warmup: warmupSecretWordProverRuntime,
  proveAndVerify: proveAndVerifySecretWord,
};

expose(workerApi);
