// Publish a device-tested build to the landing page in one step.
//
//   pnpm --filter @petal/landing publish-build -- \
//     --platform android|windows|macos --file <path/to/build> \
//     --tested-on "<device, OS, date>" [--name petal-0.1.0.apk] [--dry-run]
//     [--restage-origin https://<verified recovery host>]
//
// 1. Checks the file type matches the platform, then computes size and SHA-256.
// 2. Updates that platform's entry in src/downloads.ts (url, sizeLabel, sha256).
// 3. Builds the page, and re-stages every OTHER published build by downloading
//    it from the live site and checking its SHA-256 (a deploy replaces all
//    assets, so nothing already published may be dropped).
// 4. Deploys the Worker (wrangler login, or CLOUDFLARE_API_TOKEN +
//    CLOUDFLARE_ACCOUNT_ID), then verifies the live SHA-256 of every build.
// On any failure before the deploy succeeds, src/downloads.ts is restored.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {BUILD_NAME, sizeLabel, stage} from './stage-download.mjs';

const EXTENSIONS = {android: 'apk', windows: 'exe', macos: 'dmg'};
const WRANGLER = 'wrangler@4.139.0';
const landingDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const downloadsFile = path.join(landingDir, 'src', 'downloads.ts');

// `pnpm --filter … publish-build -- --platform …` forwards the `--` itself.
const argv = process.argv.slice(2);
const {values: args} = parseArgs({
    args: argv[0] === '--' ? argv.slice(1) : argv,
    options: {
        platform: {type: 'string'},
        file: {type: 'string'},
        'tested-on': {type: 'string'},
        name: {type: 'string'},
        'restage-origin': {type: 'string'},
        'dry-run': {type: 'boolean', default: false},
    },
});

const fail = (message) => {
    console.error(`publish-build: ${message}`);
    process.exit(1);
};

let restageOrigin = null;
if (args['restage-origin']) {
    try {
        const origin = new URL(args['restage-origin']);
        if (origin.protocol !== 'https:' || origin.username || origin.password || origin.href !== `${origin.origin}/`)
            fail('--restage-origin must be an HTTPS origin without credentials, path, query or fragment');
        restageOrigin = origin.origin;
    } catch {
        fail('--restage-origin must be a valid HTTPS origin');
    }
}

const extension = EXTENSIONS[args.platform];
if (!extension) fail('--platform must be android, windows or macos');
if (!args.file) fail('--file <path/to/build> is required');
if (!args['tested-on']?.trim())
    fail('--tested-on "<device, OS, date>" is required: only builds installed and run on a real device may be published (AGENTS.md)');
if (path.extname(args.file).toLowerCase() !== `.${extension}`) fail(`${args.platform} builds must be .${extension} files`);
statSync(args.file);

const original = readFileSync(downloadsFile, 'utf8');
const version = original.match(/version:\s*'([^']+)'/)?.[1] ?? '0.0.0';
const name = args.name ?? `petal-${version}.${extension}`;
if (!BUILD_NAME.test(name) || !name.endsWith(`.${extension}`)) fail(`--name must be lowercase and end in .${extension}`);

// Each platform entry is one object literal starting with `id: '<platform>'`.
function platformBlock(text, platform) {
    const match = text.match(new RegExp(`\\{\\s*id: '${platform}',[\\s\\S]*?\\n  \\},`));
    if (!match) fail(`could not find the ${platform} entry in src/downloads.ts`);
    return match[0];
}

function field(block, key) {
    const value = block.match(new RegExp(`${key}: (null|'[^']*')`))?.[1];
    return value == null || value === 'null' ? null : value.slice(1, -1);
}

function sha256File(file) {
    return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function run(command, commandArgs, options = {}) {
    // Launch Node directly so an executable under "Program Files" is not split by cmd.exe.
    // Only the Windows package-manager shims require a shell.
    const shell = process.platform === 'win32' && /^(npx|pnpm)(\.cmd)?$/i.test(command);
    execFileSync(command, commandArgs, {cwd: landingDir, stdio: 'inherit', shell, ...options});
}

function pnpm(commandArgs) {
    // Prefer the pnpm that launched this script; fall back to the pinned version.
    if (process.env.npm_execpath?.includes('pnpm')) run(process.execPath, [process.env.npm_execpath, ...commandArgs]);
    else run('npx', ['-y', 'pnpm@11.25.0', ...commandArgs]);
}

async function fetchVerified(url, expectedSha, target) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await fetch(url, {cache: 'no-store'});
        if (response.ok) {
            const bytes = Buffer.from(await response.arrayBuffer());
            const digest = createHash('sha256').update(bytes).digest('hex');
            if (digest === expectedSha) {
                if (target) writeFileSync(target, bytes);
                return bytes.length;
            }
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
    }
    throw new Error(`${url} did not return the expected SHA-256 ${expectedSha}`);
}

const built = {size: statSync(args.file).size, sha256: sha256File(args.file)};
const url = `https://petal.necookie.dev/download/${name}`;
const targetBlock = platformBlock(original, args.platform);
const updatedBlock = targetBlock
    .replace(/url: (null|'[^']*')/, `url: '${url}'`)
    .replace(/sizeLabel: (null|'[^']*')/, `sizeLabel: '${sizeLabel(built.size)}'`)
    .replace(/sha256: (null|'[^']*')/, `sha256: '${built.sha256}'`);
const updated = original.replace(targetBlock, updatedBlock);

const others = Object.keys(EXTENSIONS)
    .filter((platform) => platform !== args.platform)
    .map((platform) => ({platform, block: platformBlock(original, platform)}))
    .map(({platform, block}) => ({platform, url: field(block, 'url'), sha256: field(block, 'sha256')}))
    .filter((entry) => entry.url != null);

const tmp = mkdtempSync(path.join(os.tmpdir(), 'petal-publish-'));
let deployed = false;
try {
    writeFileSync(downloadsFile, updated);
    console.log(`Updated src/downloads.ts: ${args.platform} -> ${url} (${sizeLabel(built.size)}, sha256 ${built.sha256})`);

    pnpm(['run', 'test']);
    pnpm(['run', 'build']); // clears dist/

    stage(args.file, name);
    for (const other of others) {
        const otherName = decodeURIComponent(new URL(other.url).pathname.split('/').pop());
        const file = path.join(tmp, otherName);
        const source = restageOrigin ? new URL(new URL(other.url).pathname, restageOrigin).href : other.url;
        console.log(`Re-staging published ${other.platform} build ${otherName} from ${source}…`);
        await fetchVerified(source, other.sha256, file);
        stage(file, otherName);
    }

    if (args['dry-run']) {
        console.log('Dry run: staged in dist/downloads/, not deployed. src/downloads.ts restored.');
    } else {
        run('npx', ['-y', WRANGLER, 'deploy']);
        deployed = true;
        for (const entry of [{platform: args.platform, url, sha256: built.sha256}, ...others]) {
            await fetchVerified(entry.url, entry.sha256);
            console.log(`Verified live ${entry.platform}: ${entry.url}`);
        }
    }
} catch (error) {
    if (!deployed) writeFileSync(downloadsFile, original);
    rmSync(tmp, {recursive: true, force: true});
    fail(`${error.message}${deployed ? '' : '\nsrc/downloads.ts restored; nothing was published.'}`);
}
if (args['dry-run']) writeFileSync(downloadsFile, original);
rmSync(tmp, {recursive: true, force: true});

if (!args['dry-run'])
    console.log(`
Published. Commit src/downloads.ts and add this to the PR:

| Platform | File | Size | SHA-256 | Tested on |
| --- | --- | --- | --- | --- |
| ${args.platform} | [${name}](${url}) | ${sizeLabel(built.size)} | \`${built.sha256}\` | ${args['tested-on']} |
`);
