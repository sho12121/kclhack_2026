// WSLのDNSがA/AAAA同時問い合わせで停止する場合に備え、開発中の外部APIだけIPv4で解決する。
// npm run devのプリロード専用。build/start（Vercel）には読み込まれない。
import dns from "node:dns";
import { release } from "node:os";

export function developmentLookup(original, isWsl) {
  return function lookup(hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const settings = typeof options === "number" ? { family: options } : options ?? {};
    const externalApi = /(?:^|\.)(?:supabase\.co|themoviedb\.org|tmdb\.org)$/.test(hostname);
    if (isWsl && externalApi && settings.family !== 6) {
      return original(hostname, { ...settings, family: 4 }, callback);
    }
    return original(hostname, options, callback);
  };
}

const isWsl = process.platform === "linux" && Boolean(process.env.WSL_DISTRO_NAME || /microsoft|wsl/i.test(release()));
if (isWsl) dns.lookup = developmentLookup(dns.lookup.bind(dns), true);
