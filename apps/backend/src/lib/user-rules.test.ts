import { describe, expect, it } from "vitest";

import { MIN_AGE } from "@nathanget/shared-types";
import { toPublicProfile, validateNewUser } from "./user-rules.js";

// Fast "idag" så att testerna inte slutar fungera när åren går.
const now = new Date("2026-09-01");

describe("validateNewUser (registrering på servern)", () => {
  const giltig = {
    username: "kalle_2011",
    birthDate: "2005-01-01",
    sexAssignedAtBirth: "kille",
    termsAcceptedAt: new Date("2026-08-31"),
  };

  it("godkänner ett giltigt konto", () => {
    expect(validateNewUser(giltig, now)).toBeNull();
  });

  it("kräver smeknamn på minst 2 tecken (blanksteg räknas inte)", () => {
    expect(validateNewUser({ ...giltig, username: null }, now)).toBe("Smeknamn krävs.");
    expect(validateNewUser({ ...giltig, username: " k " }, now)).toBe("Smeknamn krävs.");
  });

  it("nekar saknat eller ogiltigt födelsedatum", () => {
    expect(validateNewUser({ ...giltig, birthDate: null }, now)).toBe("Ogiltigt födelsedatum.");
    expect(validateNewUser({ ...giltig, birthDate: "igår" }, now)).toBe("Ogiltigt födelsedatum.");
  });

  it("släpper in den som fyller MIN_AGE idag, men inte dagen innan", () => {
    expect(validateNewUser({ ...giltig, birthDate: `${2026 - MIN_AGE}-09-01` }, now)).toBeNull();
    expect(validateNewUser({ ...giltig, birthDate: `${2026 - MIN_AGE}-09-02` }, now)).toMatch(
      /minst 13 år/,
    );
  });

  it("nekar värden för kön vid födsel som inte finns i listan", () => {
    expect(validateNewUser({ ...giltig, sexAssignedAtBirth: "annat" }, now)).toBe(
      "Ogiltigt val av kön vid födsel.",
    );
    expect(validateNewUser({ ...giltig, sexAssignedAtBirth: undefined }, now)).toBe(
      "Ogiltigt val av kön vid födsel.",
    );
  });

  it("kräver att villkoren är godkända", () => {
    expect(validateNewUser({ ...giltig, termsAcceptedAt: null }, now)).toMatch(/villkoren/);
  });
});

describe("toPublicProfile", () => {
  const user = {
    username: "kalle_2011",
    bio: "Gillar skate",
    birthDate: new Date("2010-09-02"),
  };

  it("lämnar aldrig ut födelsedatumet", () => {
    expect(toPublicProfile(user, now)).not.toHaveProperty("birthDate");
  });

  it("räknar ut åldern och behåller övriga fält", () => {
    expect(toPublicProfile(user, now)).toEqual({
      username: "kalle_2011",
      bio: "Gillar skate",
      age: 15, // fyller 16 imorgon
    });
  });
});
