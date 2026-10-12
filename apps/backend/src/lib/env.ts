import { z } from "zod";

/**
 * Validerar miljövariabler vid uppstart. Saknas något kraschar servern direkt
 * med ett tydligt felmeddelande istället för en kryptisk fördröjd krasch.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL saknas"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET måste vara minst 32 tecken"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL måste vara en URL").default("http://localhost:3001"),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:8081"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GMAIL_USER: z.string().min(1, "GMAIL_USER saknas"),
  GMAIL_APP_PASSWORD: z.string().min(1, "GMAIL_APP_PASSWORD saknas"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Ogiltig miljökonfiguration (kontrollera apps/backend/.env):");
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join(".") || "env"}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

/** Tillåtna frontend-origins (CORS_ORIGINS) som en trimmad lista. */
export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
