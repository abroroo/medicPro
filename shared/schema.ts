import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  age: integer("age"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastVisit: timestamp("last_visit").defaultNow().notNull(),
});

export const queue = pgTable("queue", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  queueNumber: integer("queue_number").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, serving, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const clinicsRelations = relations(clinics, ({ many }) => ({
  patients: many(patients),
  queue: many(queue),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [patients.clinicId],
    references: [clinics.id],
  }),
  queueEntries: many(queue),
}));

export const queueRelations = relations(queue, ({ one }) => ({
  clinic: one(clinics, {
    fields: [queue.clinicId],
    references: [clinics.id],
  }),
  patient: one(patients, {
    fields: [queue.patientId],
    references: [patients.id],
  }),
}));

// Zod schemas
export const insertClinicSchema = createInsertSchema(clinics).pick({
  name: true,
  email: true,
  password: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  clinicId: true,
  createdAt: true,
  lastVisit: true,
});

export const insertQueueSchema = createInsertSchema(queue).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinics.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type Queue = typeof queue.$inferSelect;

// Legacy user types for auth compatibility
export const users = clinics;
export const insertUserSchema = insertClinicSchema.extend({
  username: z.string().min(1),
}).omit({ name: true, email: true }).extend({
  email: z.string().email(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = Clinic;
