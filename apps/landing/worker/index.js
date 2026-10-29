// Cloudflare Worker for petal.necookie.dev: static landing page (dist/) plus
// one-click downloads. Workers static assets cap each file at 25 MiB, so
// scripts/stage-download.mjs splits each build into 24 MiB parts under
// dist/downloads/ with a manifest; GET /download/<file> streams the parts back
// as one attachment with an exact Content-Length. Integrity is the SHA-256
// of the whole file, published on the page. Builds are never committed.
const FILE = /^[a-z0-9][a-z0-9.-]*\.(apk|exe|dmg)$/;
const CONTENT_TYPES = {
    apk: 'application/vnd.android.package-archive',
    exe: 'application/vnd.microsoft.portable-executable',
    dmg: 'application/x-apple-diskimage',
};

const notFound = () => new Response('Not found', {status: 404, headers: {'Content-Type': 'text/plain; charset=utf-8'}});

async function download(request, env, name, withBody) {
    if (!FILE.test(name)) return notFound();

    // Unknown names fall back to an HTML page or 404, so only a well-formed
    // manifest for this exact name is accepted.
    const manifestResponse = await env.ASSETS.fetch(new URL(`/downloads/${name}.json`, request.url));
    let manifest = null;
    try {
        manifest = manifestResponse.ok ? await manifestResponse.json() : null;
    } catch {
        manifest = null;
    }
    if (manifest?.name !== name || !Array.isArray(manifest.parts) || !Number.isInteger(manifest.size)) return notFound();
    // Fail before sending headers rather than aborting a 200 response after exhausting subrequests.
    if (manifest.parts.length > 49)
        return new Response('This download is temporarily unavailable.', {status: 503});

    const headers = {
        'Content-Type': CONTENT_TYPES[name.split('.').pop()],
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': String(manifest.size),
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
    };
    if (!withBody) return new Response(null, {headers});

    const {readable, writable} = new FixedLengthStream(manifest.size);
    (async () => {
        try {
            for (const part of manifest.parts) {
                const response = await env.ASSETS.fetch(new URL(`/downloads/${part}`, request.url));
                if (!response.ok || response.body == null) throw new Error(`missing part ${part}`);
                await response.body.pipeTo(writable, {preventClose: true});
            }
            await writable.close();
        } catch (error) {
            await writable.abort(error);
        }
    })();
    return new Response(readable, {headers});
}

export default {
    async fetch(request, env) {
        const {pathname} = new URL(request.url);
        const isRead = request.method === 'GET' || request.method === 'HEAD';

        if (pathname.startsWith('/download/') && isRead)
            return download(request, env, decodeURIComponent(pathname.slice('/download/'.length)), request.method === 'GET');

        // Parts and manifests are internal; only /download/<file> serves builds.
        if (pathname.startsWith('/downloads/')) return notFound();

        return env.ASSETS.fetch(request);
    },
};
