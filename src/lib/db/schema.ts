import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const visitors = pgTable("visitors", {
  id: uuid().defaultRandom().primaryKey(),
  firstName: text().notNull(),
  lastName: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});
