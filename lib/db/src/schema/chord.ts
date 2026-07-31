import { pgTable, text, timestamp, integer, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chordsTable = pgTable(
  "chords",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    root: text("root").notNull(),
    type: text("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [unique("chord_root_type_unique").on(t.root, t.type)],
);

export const chordShapesTable = pgTable(
  "chord_shapes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    chordId: text("chord_id").notNull().references(() => chordsTable.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    g: integer("g").notNull(),
    c: integer("c").notNull(),
    e: integer("e").notNull(),
    a: integer("a").notNull(),
  },
  (t) => [index("chord_shapes_chord_idx").on(t.chordId, t.orderIndex)],
);

export const chordsRelations = relations(chordsTable, ({ many }) => ({
  shapes: many(chordShapesTable),
}));

export const chordShapesRelations = relations(chordShapesTable, ({ one }) => ({
  chord: one(chordsTable, { fields: [chordShapesTable.chordId], references: [chordsTable.id] }),
}));

export const insertChordSchema = createInsertSchema(chordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChordShapeSchema = createInsertSchema(chordShapesTable).omit({ id: true });
export type InsertChord = z.infer<typeof insertChordSchema>;
export type InsertChordShape = z.infer<typeof insertChordShapeSchema>;
export type Chord = typeof chordsTable.$inferSelect;
export type ChordShape = typeof chordShapesTable.$inferSelect;
