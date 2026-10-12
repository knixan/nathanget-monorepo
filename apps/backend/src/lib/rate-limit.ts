import { createMiddleware } from "hono/factory";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/**
 * Enkel rate limiter i minnet (fast fönster) per IP. Duger för en enda
 * serverinstans; byt till delad lagring (t.ex. Redis) om backend skalas ut.
 * IP läses från x-forwarded-for, så kör bara bakom en proxy du litar på.
 */
export function rateLimit({ windowMs, max }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs);
  sweep.unref();

  return createMiddleware(async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (++entry.count > max) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: "För många förfrågningar, försök igen strax" }, 429);
    }
    await next();
  });
}
