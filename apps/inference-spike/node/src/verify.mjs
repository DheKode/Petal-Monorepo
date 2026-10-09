import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";
import {stat} from "node:fs/promises";

export async function sha256File(filePath) {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(filePath))
        hash.update(chunk);

    return hash.digest("hex");
}

// Returns {ok, reason}; never throws for a missing or mismatched file.
export async function verifyArtifact(filePath, candidate) {
    let size;
    try {
        size = (await stat(filePath)).size;
    } catch {
        return {ok: false, reason: `missing: ${filePath}`};
    }

    if (size !== candidate.sizeBytes)
        return {ok: false, reason: `size ${size} != expected ${candidate.sizeBytes}`};

    const digest = await sha256File(filePath);
    if (digest !== candidate.sha256)
        return {ok: false, reason: `sha256 ${digest} != expected ${candidate.sha256}`};

    return {ok: true, reason: `sha256 ${digest} (${size} bytes)`};
}
