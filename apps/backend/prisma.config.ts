// Prisma CLI-konfiguration (generate, migrate, studio). Prisma 7 läser inte
// .env själv, så dotenv laddar apps/backend/.env här. Servern läser .env med
// tsx --env-file (se package.json) och använder inte den här filen.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env i stället för env(): `prisma generate` behöver ingen databas
    // och ska fungera utan DATABASE_URL (t.ex. i CI).
    url: process.env.DATABASE_URL ?? "",
  },
});
