function isAllowed(parsed) {
    return parsed.protocol === 'https:' && parsed.hostname === 'bandcamp.com';
}

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const target = url.searchParams.get('url');

    if (!target) {
        return new Response('Missing url parameter', { status: 400 });
    }

    let parsed;
    try {
        parsed = new URL(target);
    } catch {
        return new Response('Invalid URL', { status: 400 });
    }

    if (!isAllowed(parsed)) {
        return new Response('Only bandcamp.com URLs are allowed', { status: 403 });
    }

    try {
        let current = parsed;
        let resp;

        // Follow redirects manually, re-validating the host on every hop
        // so bandcamp.com can't be used to pivot a fetch to another origin.
        for (let hop = 0; hop < 5; hop++) {
            resp = await fetch(current.href, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                redirect: 'manual',
            });

            if (resp.status < 300 || resp.status >= 400 || !resp.headers.has('location')) break;

            const next = new URL(resp.headers.get('location'), current.href);
            if (!isAllowed(next)) {
                return new Response('Redirect left the allowed host', { status: 502 });
            }
            current = next;
        }

        if (!resp.ok) {
            return new Response('Upstream error', { status: resp.status });
        }

        const headers = new Headers(resp.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=300');

        return new Response(resp.body, {
            status: 200,
            headers,
        });
    } catch (e) {
        return new Response('Fetch failed: ' + e.message, { status: 502 });
    }
}
