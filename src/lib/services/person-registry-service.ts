import { eq } from "drizzle-orm";

import { blindIndex, personSearchTokens } from "@/lib/crypto";
import { type DbClient, db as defaultDb } from "@/lib/db/client";
import { persons } from "@/lib/db/schema";

export type Person = typeof persons.$inferSelect;

export type PersonInput = {
  passportNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  email?: string | null;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

// What the encrypted columns cannot do for themselves: the lookup key and the
// search tokens, derived from the plaintext at the moment it is written.
function blindColumns(input: PersonInput) {
  return {
    passportNoHash: blindIndex(input.passportNo),
    searchTokens: personSearchTokens(input.fullName, input.passportNo),
  };
}

export async function findPersonByPassport(
  passportNo: string,
  db: DbClient = defaultDb,
): Promise<Person | undefined> {
  const [person] = await db
    .select()
    .from(persons)
    .where(eq(persons.passportNoHash, blindIndex(passportNo)));
  return person;
}

export async function createPerson(
  input: PersonInput,
  db: DbClient = defaultDb,
): Promise<Person> {
  const [person] = await db
    .insert(persons)
    .values({ ...input, ...blindColumns(input) })
    .returning();
  return person;
}

export async function updatePerson(
  personId: string,
  input: PersonInput,
  db: DbClient = defaultDb,
): Promise<Person | undefined> {
  const [person] = await db
    .update(persons)
    .set({ ...input, ...blindColumns(input) })
    .where(eq(persons.id, personId))
    .returning();
  return person;
}
