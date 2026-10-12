import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { secureHeaders } from "hono/secure-headers";
import { calculateAge, profileSchema } from "@nathanget/shared-types";
import { corsOrigins, env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { auth } from "./lib/auth.js";
import { rateLimit } from "./lib/rate-limit.js";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

const app = new Hono<{ Variables: { session: Session } }>();

app.use("*", secureHeaders());
app.use(
  "*",
  bodyLimit({ maxSize: 100 * 1024, onError: (c) => c.json({ error: "För stor förfrågan" }, 413) }),
);

// Tillåtna origins för frontend-apparna (kommaseparerade i CORS_ORIGINS).
app.use(
  "*",
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

// Better Auth har egen rate limiting för /auth/*. Övriga routes begränsas här.
const apiLimiter = rateLimit({ windowMs: 60_000, max: 120 });
app.use("/me/*", apiLimiter);
app.use("/users/*", apiLimiter);

// Läcker aldrig interna fel (t.ex. Prisma) till klienten.
app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path}:`, err instanceof Error ? err.message : err);
  return c.json({ error: "Något gick fel" }, 500);
});

app.all("/auth/*", (c) => auth.handler(c.req.raw));

app.get("/health", async (c) => {
  await prisma.$queryRaw`SELECT 1`;
  return c.json({ status: "ok" });
});

// Kräver inloggad session, annars 401.
const requireAuth = createMiddleware<{ Variables: { session: Session } }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Inte inloggad" }, 401);
  c.set("session", session);
  await next();
});

// --- Egen profil ---

const ownProfileSelect = {
  id: true,
  username: true,
  displayUsername: true,
  firstName: true,
  avatar: true,
  city: true,
  county: true,
  bio: true,
  favoriteMusic: true,
  favoriteMovies: true,
  favoriteBooks: true,
  favoriteGames: true,
  interests: true,
} as const;

app.get("/me/profile", requireAuth, async (c) => {
  const profile = await prisma.user.findUnique({
    where: { id: c.get("session").user.id },
    select: ownProfileSelect,
  });
  return c.json(profile);
});

app.patch("/me/profile", requireAuth, async (c) => {
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Ogiltig data" }, 400);
  }

  const d = parsed.data;
  const profile = await prisma.user.update({
    where: { id: c.get("session").user.id },
    data: {
      avatar: d.avatar || null,
      city: d.city || null,
      county: d.county || null,
      bio: d.bio || null,
      favoriteMusic: d.favoriteMusic || null,
      favoriteMovies: d.favoriteMovies || null,
      favoriteBooks: d.favoriteBooks || null,
      favoriteGames: d.favoriteGames || null,
      interests: d.interests,
    },
    select: ownProfileSelect,
  });
  return c.json(profile);
});

// --- Publik profil (andra användare, kräver ändå inloggning) ---

app.get("/users/:username", requireAuth, async (c) => {
  const user = await prisma.user.findUnique({
    where: { username: c.req.param("username").toLowerCase() },
    select: {
      username: true,
      displayUsername: true,
      firstName: true,
      avatar: true,
      city: true,
      county: true,
      bio: true,
      favoriteMusic: true,
      favoriteMovies: true,
      favoriteBooks: true,
      favoriteGames: true,
      interests: true,
      birthDate: true,
      createdAt: true,
    },
  });
  if (!user) return c.json({ error: "Profilen finns inte" }, 404);

  // Exakt födelsedatum lämnas aldrig ut – bara åldern.
  const { birthDate, ...rest } = user;
  return c.json({ ...rest, age: calculateAge(birthDate) });
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`backend listening on http://localhost:${info.port}`);
});
