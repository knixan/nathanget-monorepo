import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { MIN_AGE, isOldEnough, sexAssignedAtBirthValues } from "@nathanget/shared-types";
import { corsOrigins, env } from "./env.js";
import { prisma } from "./prisma.js";
import { sendEmail } from "./mailer.js";

const expoDevelopmentOrigins = ["exp://", "exp://**", "exp://192.168.*.*:*/**"];

export const auth = betterAuth({
  basePath: "/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Inte await: ett långsamt mejl ska inte hänga svaret. Fel loggas så att
      // en nekad/timeoutad Gmail-sändning inte kraschar processen.
      sendEmail({
        to: user.email,
        subject: "Bekräfta din e-postadress — Näthänget",
        html: `<p>Klicka för att bekräfta din e-postadress:</p><p><a href="${url}">${url}</a></p>`,
      }).catch((err) => {
        console.error(
          "Kunde inte skicka verifieringsmejl:",
          err instanceof Error ? err.message : err,
        );
      });
    },
  },
  user: {
    additionalFields: {
      // Frivilligt förnamn. Inget efternamn samlas in.
      firstName: {
        type: "string",
        required: false,
      },
      birthDate: {
        type: "date",
        required: true,
      },
      // Textfält på auth-nivå; värdet valideras mot tillåtna värden i before-hooken nedan.
      sexAssignedAtBirth: {
        type: "string",
        required: true,
      },
      // När användaren godkände villkor + integritetspolicy.
      termsAcceptedAt: {
        type: "date",
        required: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Serversidan har sista ordet (klientvalidering går att kringgå).
        before: async (user) => {
          const u = user as typeof user & {
            username?: string | null;
            birthDate?: Date | string | null;
            termsAcceptedAt?: Date | string | null;
            sexAssignedAtBirth?: string | null;
          };

          // Smeknamn (username) är obligatoriskt – username-pluginet tillåter tomt annars.
          if (!u.username || u.username.trim().length < 2) {
            throw new APIError("BAD_REQUEST", { message: "Smeknamn krävs." });
          }

          const birthDate = u.birthDate ? new Date(u.birthDate) : null;
          if (!birthDate || Number.isNaN(birthDate.getTime())) {
            throw new APIError("BAD_REQUEST", { message: "Ogiltigt födelsedatum." });
          }
          if (!isOldEnough(birthDate)) {
            throw new APIError("BAD_REQUEST", {
              message: `Du måste vara minst ${MIN_AGE} år för att skapa ett konto.`,
            });
          }

          if (
            !u.sexAssignedAtBirth ||
            !(sexAssignedAtBirthValues as readonly string[]).includes(u.sexAssignedAtBirth)
          ) {
            throw new APIError("BAD_REQUEST", { message: "Ogiltigt val av kön vid födsel." });
          }

          // Villkor + integritetspolicy måste vara godkända.
          const acceptedAt = u.termsAcceptedAt ? new Date(u.termsAcceptedAt) : null;
          if (!acceptedAt || Number.isNaN(acceptedAt.getTime())) {
            throw new APIError("BAD_REQUEST", {
              message: "Du måste godkänna villkoren och integritetspolicyn.",
            });
          }
        },
      },
    },
  },
  plugins: [
    // Tillåter inloggning med smeknamn (username) utöver e-post.
    username({ minUsernameLength: 2, maxUsernameLength: 30 }),
    expo(),
  ],
  trustedOrigins: [
    ...corsOrigins,
    "nathanget://",
    ...(env.NODE_ENV === "development" ? expoDevelopmentOrigins : []),
  ],
});
