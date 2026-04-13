// Minimal Cloudflare Pages / D1 types to satisfy Next.js typecheck
// (Runtime types are provided by Cloudflare; this is just for local TS.)
type D1Database = any;

interface PagesFunction<Env = unknown> {
  (context: {
    request: Request;
    env: Env;
    params: Record<string, string>;
    waitUntil: (promise: Promise<any>) => void;
    next: (input?: Request | string) => Promise<Response>;
  }): Response | Promise<Response>;
}