// Reuse the existing portfolio domain adapter for this static, wordless artwork.
export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const incoming = new URL(request.url);
    const upstream = new URL(env.ORIGIN);
    upstream.pathname = incoming.pathname;
    upstream.search = incoming.search;
    const headers = new Headers(request.headers);
    for (const name of ['cookie', 'authorization', 'host']) headers.delete(name);
    const response = await fetch(upstream, { method: request.method, headers, redirect: 'manual' });
    const outgoing = new Headers(response.headers);
    outgoing.delete('set-cookie');
    outgoing.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const location = outgoing.get('location');
    if (location && new URL(location, upstream).origin === upstream.origin) {
      const destination = new URL(location, upstream);
      outgoing.set('location', incoming.origin + destination.pathname + destination.search + destination.hash);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outgoing,
    });
  },
};
