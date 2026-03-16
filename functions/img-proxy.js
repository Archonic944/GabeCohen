export async function onRequest(context) {
    const url = new URL(context.request.url);
    const target = url.searchParams.get('url');

    if (!target) {
        return new Response('Missing url parameter', { status: 400 });
    }

    // Only allow Bandcamp CDN URLs
    let parsed;
    try {
        parsed = new URL(target);
    } catch {
        return new Response('Invalid URL', { status: 400 });
    }

    if (!parsed.hostname.endsWith('.bcbits.com')) {
        return new Response('Only Bandcamp CDN URLs are allowed', { status: 403 });
    }

    try {
        const resp = await fetch(target, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        if (!resp.ok) {
            return new Response('Upstream error', { status: resp.status });
        }

        const headers = new Headers(resp.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=86400');

        return new Response(resp.body, {
            status: 200,
            headers,
        });
    } catch (e) {
        return new Response('Fetch failed: ' + e.message, { status: 502 });
    }
}
