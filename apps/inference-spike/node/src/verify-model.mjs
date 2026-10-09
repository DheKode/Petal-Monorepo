// Usage: pnpm verify-model [candidate-id]
// Offline integrity check of an already downloaded artifact.
import {getCandidate, modelPath} from "./models.mjs";
import {verifyArtifact} from "./verify.mjs";

const candidate = getCandidate(process.argv[2]);
const result = await verifyArtifact(modelPath(candidate), candidate);
console.log(`${result.ok ? "OK" : "FAIL"} ${modelPath(candidate)}\n  ${result.reason}`);
process.exit(result.ok ? 0 : 1);
