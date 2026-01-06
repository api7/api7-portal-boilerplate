export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const target = "https://developer.apiseven.com" + url.pathname;
      return fetch(target, request);
    }

    return env.ASSETS.fetch(request);
  }
}