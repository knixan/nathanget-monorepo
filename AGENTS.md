# Regler för AI-agenter i det här repot

Skriv på **svenska**: UI-texter, kommentarer, felmeddelanden, kanban-kort och commit-meddelanden. Variabel- och funktionsnamn är på engelska (som i koden runt omkring), testnamn och testdata på svenska.

## Vad är Näthänget?

Ett socialt nätverk för unga (från **13 år**). Säkerhet för minderåriga går före funktioner – se Domänregler.

| Del                     | Teknik                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| `apps/backend`          | Hono, Better Auth, Prisma 6 (PostgreSQL/Neon), Nodemailer             |
| `apps/web`              | Vite, React 19, TanStack Router + Query, Tailwind v4, shadcn, oxlint  |
| `apps/mobile`           | Expo 57 (React Native), expo-router – **läs `apps/mobile/AGENTS.md`** |
| `packages/shared-types` | zod-scheman, typer och konstanter som delas av backend, web och mobil |

### Gör så här

- **Validering, gränser och konstanter** som används på fler än ett ställe → `packages/shared-types/src/index.ts`. Samma zod-schema används i formuläret och på servern. Kopiera aldrig ett schema eller en gräns (t.ex. `MIN_AGE`, `MAX_BIO_LENGTH`) till en app.
- **Ny endpoint** → `apps/backend/src/index.ts`. Inloggning krävs med `requireAuth`. Ett nytt route-prefix ska ha `apiLimiter` (`app.use("/prefix/*", apiLimiter)`).
- **Rena regler** (utan databas, env eller nätverk) → `apps/backend/src/lib/user-rules.ts` eller en ny fil bredvid, med tester. Sådana filer får aldrig importera `env.ts`, `prisma.ts` eller `auth.ts` – då går de inte att testa.
- **Ny sida i webben** → `apps/web/src/routes/`. Sidor som kräver inloggning läggs under `routes/_authed/`. `routeTree.gen.ts` genereras – redigera den aldrig.
- **API-anrop** går via `apps/web/src/lib/api.ts` (proxas `/api` → backend) respektive `EXPO_PUBLIC_API_URL` i mobilen. Auth går via `lib/auth-client.ts` i varje app.

## Domänregler (påverkar säkerhet för minderåriga)

- **Servern har sista ordet.** Klientvalidering går att kringgå. Varje skrivning validerar med zod på servern (`safeParse` → 400 med första felmeddelandet). Registrering kontrolleras i `validateNewUser` (`user-rules.ts`), som anropas från better-auths `databaseHooks.user.create.before`.
- **Användar-id kommer alltid från sessionen** (`c.get("session").user.id`), aldrig från body, query eller URL.
- **Lämna aldrig ut mer än nödvändigt.** Hämta användardata med en uttrycklig `select` – returnera aldrig hela `user`-objektet. Andra användare får aldrig se e-post, exakt födelsedatum (bara ålder via `toPublicProfile`) eller `sexAssignedAtBirth`.
- **Åldersgränsen** är `MIN_AGE` i `shared-types` och räknas bara på kalenderdatum (`calculateAge`). Ändra den aldrig utan att användaren ber om det.
- **Planerat enligt kanban – bygg inte emot det:** hård separation mellan minderåriga och vuxna (i backend, inte som en inställning), ingen kontaktväg mellan vuxna och minderåriga, inga externa länkar/handles, inga synliga metrics (likes, följare, antal vänner), färdiga avatarer i stället för bilduppladdning.
- **Fel läcker aldrig ut.** `app.onError` svarar `"Något gick fel"` – skicka aldrig `err.message` från Prisma eller liknande till klienten.
- **Hemligheter** ligger bara i `.env` (gitignore). Nya miljövariabler läggs till i `apps/backend/src/lib/env.ts` (zod), i `.env.example` och i README.

## Dokumentation – gissa inte

Versionerna är nyare än det du lärt dig. Slå upp i dokumentationen innan du använder ett API du är osäker på, och **alltid** när det gäller auth, databas eller säkerhet.

- **`llms.txt` är en innehållsförteckning.** Hämta den, hitta rätt sida och hämta bara den sidan (oftast finns en `.md`-version). Hämta aldrig `llms-full.txt` – den är hundratals KB och fyller sammanhanget med sådant som inte behövs.
- **Kolla versionen.** Dokumentationen beskriver oftast senaste versionen. Stämmer den inte med tabellen – leta efter en versionerad sida eller säg till.

Sorterat efter hur mycket biblioteket används i projektet:

| Bibliotek    | Version | Används i       | Dokumentation                                                                                                                 |
| ------------ | ------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| better-auth  | 1.7     | alla tre appar  | https://better-auth.com/docs/llms.txt (1.7 = "Latest"; byts den till 1.8 – se versionerna i https://better-auth.com/llms.txt) |
| zod          | 4       | alla + shared   | https://zod.dev/llms.txt                                                                                                      |
| Hono         | 4.13    | backend         | https://hono.dev/llms.txt                                                                                                     |
| Prisma       | **6**   | backend         | https://www.prisma.io/llms.txt – beskriver Prisma 7. Vi kör 6: ingen `prisma.config.ts`, generator `prisma-client-js`         |
| React Native | 0.86    | mobile          | https://reactnative.dev/llms.txt                                                                                              |
| Expo         | 57      | mobile          | https://docs.expo.dev/llms.txt + https://docs.expo.dev/versions/v57.0.0/ och `apps/mobile/AGENTS.md`                          |
| TanStack     | –       | web, mobile     | https://tanstack.com/llms.txt (Router 1.170 i web, Query 5 i web och mobile)                                                  |
| shadcn/ui    | –       | web             | https://ui.shadcn.com/llms.txt                                                                                                |
| Vite         | 8       | web             | https://vite.dev/llms.txt                                                                                                     |
| Tailwind CSS | 4       | web             | https://tailwindcss.com/docs (ingen llms.txt)                                                                                 |
| Nodemailer   | 10      | backend         | https://nodemailer.com/about/ (ingen llms.txt)                                                                                |
| Vitest       | 4       | backend, shared | https://vitest.dev/llms.txt                                                                                                   |
| Turborepo    | 2       | repo            | https://turborepo.com/llms.txt                                                                                                |

## Kommandon

Kör från **repo-roten**.

```bash
pnpm dev                     # alla appar (backend 3001, web 5173, expo 8081)
pnpm --filter @nathanget/web dev
pnpm typecheck               # obs: typecheck, inte type-check
pnpm lint                    # oxlint (web), eslint (mobile)
pnpm test                    # vitest i shared-types och backend
pnpm format                  # Prettier på hela repot (format:check i CI)
pnpm build

# Databas (schema i apps/backend/prisma/schema.prisma)
pnpm --filter @nathanget/backend prisma:generate
pnpm --filter @nathanget/backend prisma:migrate   # ny migrering
pnpm --filter @nathanget/backend prisma:studio
```

## Klart betyder

1. `pnpm format:check`, `pnpm typecheck`, `pnpm lint` och `pnpm test` går igenom. Filer du ändrar formateras och lintas automatiskt av hooken – kör `pnpm format` om du skapat filer på annat sätt. Kör `pnpm build` vid ändringar i konfig, beroenden eller `shared-types`.
2. Nya eller ändrade regler (validering, åldersgränser, behörighet, vad som lämnas ut) har tester i `packages/shared-types/src/*.test.ts` eller `apps/backend/src/**/*.test.ts`.
3. Ändringar i UI: säg tydligt vad du **inte** har kunnat testa (t.ex. inloggade sidor, mobilappen på telefon).
4. Kanban är uppdaterad (se nedan).
5. Du har skrivit ett commit-meddelande.
6. Du har avslutat med ett "Lär dig"-block (se nedan), om uppgiften var större än en småfix.

## Lärande

Användaren vill fräscha upp och fördjupa sina kunskaper medan hen bygger – inte bara få koden skriven. Avsluta därför varje **större** uppgift (ny funktion, buggfix med en lärdom, säkerhet, databas, arkitektur) med ett kort block, **efter** sammanfattning och commit-meddelande:

```
**Lär dig: <ämne>**
**Fakta:** en sak från koden du just skrev, med länk till filen/raden.
**Varför:** varför man gör så – och vad som händer om man inte gör det.
**Frågor:**
1. en fråga om just den här koden (förstå, förutsäga eller hitta i koden),
2. en fråga till – gärna en vanlig intervjufråga inom samma ämne.
```

- **Max ca 10 rader och 2 frågor.** Hoppa över för småfix (stavfel, formatering, kanban, konfig utan lärdom).
- **Utgå från det som just byggdes**, inte allmänna övningar. Rotera ämnen: TypeScript, React, TanStack Router/Query, Hono, Better Auth, Prisma/PostgreSQL, säkerhet, React Native/Expo, testning, verktyg (git, pnpm, Turborepo, CI).
- **Avslöja inte svaren.** Vänta på användarens svar, rätta kort (rätt/delvis/fel + det viktigaste i 2–4 meningar). Säger hen "vet inte": ledtråd först.
- **Logga** varje block i `.claude/larande/logg.md` (privat, gitignore) i samma format som de som redan finns, och uppdatera status när användaren har svarat (`ny` → `rätt`/`delvis`/`fel` + datum). Frågor med `fel` tas upp igen i ett senare block eller i `/quiz`.
- **Nivå:** användaren kan bygga projekt och förstår helheten, men har skrivit lite kod själv på sistone. Svarar hen lätt rätt – gå djupare (avvägningar, alternativ). Svarar hen fel – enklare och mer konkret.
- Användaren styr: "hoppa över" hoppar över ett block, "pausa lärandet" stänger av blocken tills hen säger till, "mer om det här" ger en fördjupning. `/quiz` ger 5 repetitionsfrågor ur loggen (`.claude/skills/quiz`, privat).

## Git

- **Committa och pusha aldrig.** Användaren committar själv. En hook stoppar `git commit` och `git push`.
- Avsluta med ett commit-meddelande på svenska: kort rubrik, tom rad, punktlista. Sist: `Co-Authored-By`-raden från systemet.
- CI (`.github/workflows/ci.yml`) kör format:check, lint, typecheck, test och build på påverkade paket vid push och PR mot `main`, plus ett säkerhetsjobb (prisma validate, audit, gitleaks) och CodeQL.

## Databas

- Ett schema: `apps/backend/prisma/schema.prisma`. Better Auth-modellerna (`user`, `session`, `account`, `verification`) har extrafält – ändra dem i både schemat och `user.additionalFields` i `lib/auth.ts` (och `inferAdditionalFields` i webbens `auth-client.ts`).
- Säg till innan en migrering raderar eller ändrar befintlig data. Föredra att lägga till kolumner (nullable eller med default) framför att döpa om eller droppa.
- `prisma migrate reset` kräver alltid uttryckligt godkännande från användaren i ett nytt meddelande.

## Kanban

GitHub Project 18 (`knixan`, "@Projekt-Näthänget"), vyn _Kanban_: https://github.com/users/knixan/projects/18/views/3. Repo `knixan/nathanget-monorepo`.

- Varje kort är en **issue** i repot som ligger i projektet. Titeln börjar med område i hakparentes: `[Auth]`, `[Profil]`, `[Säkerhet]`, `[Flaskpost]`, `[Gästbok]`, `[Vänner]`, `[Setup]` … Återanvänd ett befintligt område om det passar.
- **Börja en uppgift:** ber användaren dig jobba på ett kort – läs issuen (`gh issue view <nr>`) och flytta kortet till _In Progress_.
- **När du blir klar:** flytta kortet till _Done_ om allt i det är gjort, annars låt det stå kvar och skriv en kommentar på issuen om vad som återstår. Skapa nya kort för det som blir kvar eller som du upptäcker (t.ex. buggar, säkerhetsluckor).
- **Commit-meddelandet** nämner issuen: `Closes #<nr>` om kortet är klart, annars `Del av #<nr>`. När användaren pushar till `main` stänger GitHub issuen och projektet flyttar kortet till _Done_ (workflow "Item closed").
- Skriv issuens body i en fil och använd `--body-file` (långa heredocs i bash går sönder).
- Flytta inte kort, skapa inte kort och stäng inte issues utan att användaren har bett om kanban-uppdatering eller att det ingår i uppgiften. Säg vilka kort du har ändrat.
- `/kanban` (`.claude/skills/kanban`) visar tavlan och hjälper till att flytta och skapa kort.

| Vad         | ID                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------- |
| Projekt     | `PVT_kwHODHG13M4Bhnqt`                                                                      |
| Status-fält | `PVTSSF_lAHODHG13M4Bhnqtzhgivlw` – Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657` |

```bash
# Lista korten (id = PVTI_… används för att byta status)
gh project item-list 18 --owner knixan --format json --limit 200

# Nytt kort
gh issue create -R knixan/nathanget-monorepo --title "[Område] Titel" --body-file kort.md
gh project item-add 18 --owner knixan --url <issue-url> --format json --jq .id
gh project item-edit --project-id PVT_kwHODHG13M4Bhnqt --id <item-id> \
  --field-id PVTSSF_lAHODHG13M4Bhnqtzhgivlw --single-select-option-id f75ad846
```

Att sätta status Done stänger issuen automatiskt (workflow "Auto-close issue"), och en stängd issue flyttas till Done ("Item closed"). Nya issues läggs **inte** till i projektet automatiskt – kör alltid `gh project item-add`.
