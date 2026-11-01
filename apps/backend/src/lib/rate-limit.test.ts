import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rateLimit } from "./rate-limit.js";

// En liten Hono-app med bara limitern – app.request() kör ett riktigt anrop
// genom middlewaren utan att starta någon server.
function skapaApp(max: number) {
  const app = new Hono();
  app.use("*", rateLimit({ windowMs: 60_000, max }));
  app.get("/", (c) => c.text("ok"));
  return app;
}

const fran = (ip: string) => ({ headers: { "x-forwarded-for": ip } });

describe("rateLimit", () => {
  // Falska timers: Date.now() och setInterval styrs av testet, så vi kan
  // "spola fram" en minut utan att vänta.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("släpper igenom max anrop och svarar sedan 429 med Retry-After", async () => {
    const app = skapaApp(2);
    expect((await app.request("/", fran("1.1.1.1"))).status).toBe(200);
    expect((await app.request("/", fran("1.1.1.1"))).status).toBe(200);

    const nekad = await app.request("/", fran("1.1.1.1"));
    expect(nekad.status).toBe(429);
    expect(nekad.headers.get("Retry-After")).toBe("60");
  });

  it("räknar varje IP för sig", async () => {
    const app = skapaApp(1);
    expect((await app.request("/", fran("1.1.1.1"))).status).toBe(200);
    expect((await app.request("/", fran("2.2.2.2"))).status).toBe(200);
    expect((await app.request("/", fran("1.1.1.1"))).status).toBe(429);
  });

  it("använder första adressen i x-forwarded-for (klienten, inte proxyn)", async () => {
    const app = skapaApp(1);
    expect((await app.request("/", fran("1.1.1.1, 10.0.0.1"))).status).toBe(200);
    expect((await app.request("/", fran("1.1.1.1, 10.0.0.2"))).status).toBe(429);
  });

  it("nollställs när fönstret har gått ut", async () => {
    const app = skapaApp(1);
    expect((await app.request("/", fran("1.1.1.1"))).status).toBe(200);
    expect((await app.request("/", fran("1.1.1.1"))).status).toBe(429);

    vi.advanceTimersByTime(60_000);
    expect((await app.request("/", fran("1.1.1.1"))).status).toBe(200);
  });
});
