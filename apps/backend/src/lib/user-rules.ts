import {
  MIN_AGE,
  calculateAge,
  isOldEnough,
  sexAssignedAtBirthValues,
} from "@nathanget/shared-types";

// Rena regler utan databas, env eller nätverk – så att de går att testa
// (se user-rules.test.ts). Importera aldrig env.ts, prisma.ts eller auth.ts här.

/** Det Better Auth skickar till `databaseHooks.user.create.before`. */
export interface NewUserInput {
  username?: string | null;
  birthDate?: Date | string | null;
  termsAcceptedAt?: Date | string | null;
  sexAssignedAtBirth?: string | null;
}

/**
 * Serverns kontroll av ett nytt konto. Klientvalidering går att kringgå, så
 * det här är sista ordet. Returnerar ett felmeddelande, eller `null` om allt är ok.
 */
export function validateNewUser(u: NewUserInput, now: Date = new Date()): string | null {
  // Smeknamn (username) är obligatoriskt – username-pluginet tillåter tomt annars.
  if (!u.username || u.username.trim().length < 2) {
    return "Smeknamn krävs.";
  }

  const birthDate = u.birthDate ? new Date(u.birthDate) : null;
  if (!birthDate || Number.isNaN(birthDate.getTime())) {
    return "Ogiltigt födelsedatum.";
  }
  if (!isOldEnough(birthDate, now)) {
    return `Du måste vara minst ${MIN_AGE} år för att skapa ett konto.`;
  }

  if (
    !u.sexAssignedAtBirth ||
    !(sexAssignedAtBirthValues as readonly string[]).includes(u.sexAssignedAtBirth)
  ) {
    return "Ogiltigt val av kön vid födsel.";
  }

  // Villkor + integritetspolicy måste vara godkända.
  const acceptedAt = u.termsAcceptedAt ? new Date(u.termsAcceptedAt) : null;
  if (!acceptedAt || Number.isNaN(acceptedAt.getTime())) {
    return "Du måste godkänna villkoren och integritetspolicyn.";
  }

  return null;
}

/** Exakt födelsedatum lämnas aldrig ut till andra användare – bara åldern. */
export function toPublicProfile<T extends { birthDate: Date }>(
  user: T,
  now: Date = new Date(),
): Omit<T, "birthDate"> & { age: number } {
  const { birthDate, ...rest } = user;
  return { ...rest, age: calculateAge(birthDate, now) };
}
