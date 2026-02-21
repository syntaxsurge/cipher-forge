import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const acvmWasmSource = path.join(
  root,
  "node_modules",
  "@noir-lang",
  "acvm_js",
  "web",
  "acvm_js_bg.wasm",
);
const noircWasmSource = path.join(
  root,
  "node_modules",
  "@noir-lang",
  "noirc_abi",
  "web",
  "noirc_abi_wasm_bg.wasm",
);
const circuitSource = path.join(
  root,
  "zk",
  "secret_word_puzzle",
  "target",
  "secret_word_puzzle.json",
);

const wasmDestinationDir = path.join(root, "public", "zk", "wasm");
const circuitDestinationDir = path.join(root, "public", "zk");

async function syncNoirAssets() {
  await mkdir(wasmDestinationDir, { recursive: true });
  await mkdir(circuitDestinationDir, { recursive: true });

  await copyFile(acvmWasmSource, path.join(wasmDestinationDir, "acvm_js_bg.wasm"));
  await copyFile(
    noircWasmSource,
    path.join(wasmDestinationDir, "noirc_abi_wasm_bg.wasm"),
  );
  await copyFile(circuitSource, path.join(circuitDestinationDir, "secret_word_puzzle.json"));

  console.log("Synced Noir circuit and WASM assets into public/zk.");
}

syncNoirAssets().catch((error) => {
  console.error("Failed to sync Noir assets:", error);
  process.exit(1);
});
