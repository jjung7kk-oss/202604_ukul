import { pgTable, text, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoresTable = pgTable(
  "scores",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull().default(""),
    sharedChordText: text("shared_chord_text").notNull().default(""),
    notation: jsonb("notation").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("scores_user_updated_idx").on(t.userId, t.updatedAt)],
);

export const scoreVersesTable = pgTable(
  "score_verses",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    scoreId: text("score_id").notNull().references(() => scoresTable.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    label: text("label").notNull(),
    lyrics: text("lyrics").notNull().default(""),
  },
  (t) => [index("score_verses_score_idx").on(t.scoreId, t.orderIndex)],
);

export const scoresRelations = relations(scoresTable, ({ many }) => ({
  verses: many(scoreVersesTable),
}));

export const scoreVersesRelations = relations(scoreVersesTable, ({ one }) => ({
  score: one(scoresTable, { fields: [scoreVersesTable.scoreId], references: [scoresTable.id] }),
}));

export const insertScoreSchema = createInsertSchema(scoresTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScoreVerseSchema = createInsertSchema(scoreVersesTable).omit({ id: true });
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type InsertScoreVerse = z.infer<typeof insertScoreVerseSchema>;
export type Score = typeof scoresTable.$inferSelect;
export type ScoreVerse = typeof scoreVersesTable.$inferSelect;
