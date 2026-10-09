// Cloudflare Pages Function: GET /download/<file>.apk
// Pages caps each static file at 25 MiB, so scripts/stage-apk.mjs splits the
// APK into parts under dist/apk/ with a manifest. This streams the parts back
// as one attachment with an exact Content-Length. Integrity is published on
// the page as the SHA-256 of the whole file.
const NAME = /^[a-z0-9][a-z0-9.-]*\.apk$/;

async function serve({params, env, request}, withBody) {
    const name = String(params.name);
    if (!NAME.test(name)) return new Response('Not found', {status: 404});

    // A missing manifest comes back as the HTML index (Pages fallback), so
    // anything that is not a well-formed manifest for this name is a 404.
    const manifestResponse = await env.ASSETS.fetch(new URL(`/apk/${name}.json`, request.url));
    let manifest = null;
    try {
        manifest = manifestResponse.ok ? await manifestResponse.json() : null;
    } catch {
        manifest = null;
    }
    if (manifest?.name !== name || !Array.isArray(manifest.parts) || !Number.isInteger(manifest.size))
        return new Response('Not found', {status: 404});

    const headers = {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': String(manifest.size),
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
    };
    if (!withBody) return new Response(null, {headers});

    const {readable, writable} = new FixedLengthStream(manifest.size);
    (async () => {
        try {
            for (const part of manifest.parts) {
                const response = await env.ASSETS.fetch(new URL(`/apk/${part}`, request.url));
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

export const onRequestGet = (context) => serve(context, true);
export const onRequestHead = (context) => serve(context, false);
