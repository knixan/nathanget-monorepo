# Näthänget

Monorepo för **Näthänget** – webb, mobil och backend i ett och samma repo,
hanterat med [Turborepo](https://turbo.build/) och [pnpm workspaces](https://pnpm.io/workspaces).

## Teknikstack

| Del                                 | Teknik                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Web** (`apps/web`)                | Vite 8, React 19, TanStack Router + Query, Tailwind v4, shadcn/Radix UI, react-hook-form + zod |
| **Mobile** (`apps/mobile`)          | Expo (React Native 0.86), expo-router, TanStack Query, react-hook-form + zod                   |
| **Backend** (`apps/backend`)        | Hono, Better Auth, Prisma (PostgreSQL/Neon), Nodemailer (Gmail SMTP)                           |
| **Delat** (`packages/shared-types`) | Delade TypeScript-typer (`@nathanget/shared-types`)                                            |
| **Verktyg**                         | pnpm 9, Turborepo, TypeScript, oxlint                                                          |

## Struktur

```
apps/
  backend/        Hono-API + Better Auth + Prisma
  web/            Vite + React SPA
  mobile/         Expo-app
packages/
  shared-types/   Delade typer mellan apparna
```

Auth-flödet: både web och mobil pratar med backendens Better Auth på `/auth/*`.
Web proxar `/api/*` → `http://localhost:3001` via Vite (se `apps/web/vite.config.ts`).
Mobil pekar på `EXPO_PUBLIC_API_URL` (default `http://localhost:3001`).

## Förkrav

- **Node** >= 22
- **pnpm** 9.15.0 (`corepack enable` rekommenderas)
- En **PostgreSQL**-databas (t.ex. [Neon](https://neon.tech/))
- Ett **Gmail-konto med app-lösenord** för verifieringsmejl

## Kom igång

```bash
# 1. Installera alla workspace-beroenden
pnpm install

# 2. Sätt upp backend-miljövariabler
cp apps/backend/.env.example apps/backend/.env
#   fyll i DATABASE_URL, BETTER_AUTH_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD ...

# 3. Generera Prisma-klient + kör migreringar mot din databas
pnpm --filter @nathanget/backend prisma:generate
pnpm --filter @nathanget/backend prisma:migrate

# 4. Starta allt i dev-läge (turbo kör alla appars dev-script parallellt)
pnpm dev
```

Standardportar i dev:

| Tjänst        | URL                   |
| ------------- | --------------------- |
| Backend       | http://localhost:3001 |
| Web           | http://localhost:5173 |
| Mobile (Expo) | http://localhost:8081 |

### Köra en enskild app

```bash
pnpm --filter @nathanget/web dev
pnpm --filter @nathanget/backend dev
pnpm --filter @nathanget/mobile start      # Expo; tryck a / i / w för android / ios / web
```

## Miljövariabler

### `apps/backend/.env`

| Variabel             | Beskrivning                                              |
| -------------------- | -------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL-connection string (Neon)                      |
| `PORT`               | Backend-port (default `3001`)                            |
| `BETTER_AUTH_SECRET` | Hemlig nyckel för Better Auth (minst 32 tecken)          |
| `BETTER_AUTH_URL`    | Backendens publika URL (default `http://localhost:3001`) |
| `CORS_ORIGINS`       | Tillåtna origins (CORS + Better Auth), kommaseparerade   |
| `NODE_ENV`           | `development` / `production`                             |
| `GMAIL_USER`         | Gmail-adress som skickar verifieringsmejl                |
| `GMAIL_APP_PASSWORD` | Gmail app-lösenord (inte kontolösenordet)                |

### `apps/mobile`

| Variabel              | Beskrivning                                        |
| --------------------- | -------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | URL till backend (default `http://localhost:3001`) |

## Scripts (repo-roten)

Alla kör via Turborepo över hela workspacet:

| Kommando         | Gör                           |
| ---------------- | ----------------------------- |
| `pnpm dev`       | Startar alla appar i dev-läge |
| `pnpm build`     | Bygger alla paket             |
| `pnpm lint`      | Lintar alla paket             |
| `pnpm typecheck` | Typkollar alla paket          |
| `pnpm test`      | Kör tester                    |

## Databas (Prisma)

Schemat ligger i `apps/backend/prisma/schema.prisma` och innehåller Better Auth-modellerna
(`user`, `session`, `account`, `verification`) med extrafält på användaren
(`username` + `displayUsername`, `firstName`, `birthDate`, `sexAssignedAtBirth`,
`termsAcceptedAt`, `bio`, `interests`).

Auth: inloggning sker med **e-post eller smeknamn** (`username`-pluginet). Förnamn är
frivilligt, efternamn samlas inte in.

Profil: `bio` ("om mig") och `interests` (lista) redigeras på `/profil` via de
session-skyddade endpointerna `GET/PATCH /me/profile` i backend.

```bash
pnpm --filter @nathanget/backend prisma:generate   # generera klient
pnpm --filter @nathanget/backend prisma:migrate    # skapa/köra migrering
pnpm --filter @nathanget/backend prisma:studio     # öppna Prisma Studio
```

> Efter en ren `pnpm install` måste `prisma:generate` köras innan backend typkollar/bygger.

## CI

`.github/workflows/ci.yml` körs vid push och PR mot `main`. Den installerar beroenden,
kollar formatering (`prettier --check`), genererar Prisma-klienten och kör `lint`,
`typecheck`, `test` och `build` – men bara på de paket som påverkats av ändringen
(`turbo run ... --filter="...[ref]"`).

Ett separat `security`-jobb kör `prisma validate`, `pnpm audit --prod` (high+) och
gitleaks (hemlighetsskanning). `.github/workflows/codeql.yml` kör CodeQL vid push, PR
och varje måndag, och `.github/dependabot.yml` föreslår veckovisa uppdateringar av
npm-beroenden och GitHub Actions. Pågående CI-körningar för samma ref avbryts när en
ny push kommer.

Rekommenderat i GitHub: skydda `main` (Settings → Branches) med obligatoriska checks
och kräv PR – jobben `ci` och `security` samt CodeQL.

### Köra CI lokalt

Kör samma steg som CI innan du pushar:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm --filter @nathanget/backend prisma:generate
pnpm turbo run lint typecheck test build --filter="...[HEAD^1]"
```

`--filter="...[HEAD^1]"` = bara paket som ändrats sedan förra commiten (plus det som beror på dem),
precis som CI. **Kör från repo-roten**, inte inifrån en app-mapp.

Vill du testa **hela** monorepot oavsett vad som ändrats:

```bash
pnpm format && pnpm turbo run lint typecheck test build
```

## Backend-säkerhet

- Säkerhetsheaders (`hono/secure-headers`), max 100 KB request-body och en global
  felhanterare som inte läcker interna fel.
- Rate limiting (120 anrop/min per IP) på `/me/*` och `/users/*`; `/auth/*` skyddas av
  Better Auth. Begränsningen ligger i minnet och räcker för en serverinstans – kör
  backend bakom en proxy du litar på (IP läses från `x-forwarded-for`).
- Servern validerar ålder, villkorsgodkännande och `sexAssignedAtBirth` vid registrering.
