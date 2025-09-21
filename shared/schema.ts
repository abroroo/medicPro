import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial, boolean, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New users table for multi-user per clinic support
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  role: text("role").notNull().default("user"), // 'doctor', 'receptionist', 'user', 'head_doctor'
  isActive: boolean("is_active").default(true).notNull(),
  // Doctor-specific fields (only used when role is 'doctor' or 'head_doctor')
  specialization: text("specialization"),
  cabinetNumber: text("cabinet_number"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

// Separate admins table for system administrators
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  age: integer("age"),
  dateOfBirth: date("date_of_birth"),
  bloodType: text("blood_type"),
  address: text("address"),
  allergies: text("allergies"), // JSON string for flexible allergy data
  chronicConditions: text("chronic_conditions"), // JSON string for conditions
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastVisit: timestamp("last_visit"),
});


export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  visitDate: date("visit_date").notNull(),
  visitType: text("visit_type").notNull(), // Consultation, Dental, Gynecology, Follow-up, Emergency
  chiefComplaint: text("chief_complaint"),
  status: text("status").notNull().default("Scheduled"), // Scheduled, In-Progress, Completed, Cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clinicalNotes = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => visits.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  symptoms: text("symptoms"),
  clinicalExamination: text("clinical_examination"),
  diagnosis: text("diagnosis"),
  treatmentGiven: text("treatment_given"),
  medications: text("medications"),
  recommendations: text("recommendations"),
  followUpDate: date("follow_up_date"),
  followUpNeeded: boolean("follow_up_needed").default(false).notNull(),
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const queue = pgTable("queue", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id),
  visitId: integer("visit_id").references(() => visits.id),
  queueNumber: integer("queue_number").notNull(),
  visitType: text("visit_type"),
  status: text("status").notNull().default("waiting"), // waiting, serving, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const clinicsRelations = relations(clinics, ({ many }) => ({
  patients: many(patients),
  visits: many(visits),
  queue: many(queue),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  clinic: one(clinics, {
    fields: [users.clinicId],
    references: [clinics.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [patients.clinicId],
    references: [clinics.id],
  }),
  visits: many(visits),
  queueEntries: many(queue),
}));


export const visitsRelations = relations(visits, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [visits.clinicId],
    references: [clinics.id],
  }),
  patient: one(patients, {
    fields: [visits.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [visits.doctorId],
    references: [users.id],
  }),
  clinicalNotes: many(clinicalNotes),
  queueEntry: one(queue, {
    fields: [visits.id],
    references: [queue.visitId],
  }),
}));

export const clinicalNotesRelations = relations(clinicalNotes, ({ one }) => ({
  visit: one(visits, {
    fields: [clinicalNotes.visitId],
    references: [visits.id],
  }),
  doctor: one(users, {
    fields: [clinicalNotes.doctorId],
    references: [users.id],
  }),
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
  doctor: one(users, {
    fields: [queue.doctorId],
    references: [users.id],
  }),
  visit: one(visits, {
    fields: [queue.visitId],
    references: [visits.id],
  }),
}));

// Zod schemas
export const insertClinicSchema = createInsertSchema(clinics).pick({
  name: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

// Schema for creating doctor users (includes doctor-specific fields)
export const insertDoctorUserSchema = insertUserSchema.extend({
  specialization: z.string().min(1, "Specialization is required"),
  cabinetNumber: z.string().optional(),
  phone: z.string().optional(),
}).refine(data => data.role === 'doctor' || data.role === 'head_doctor', {
  message: "Doctor-specific fields are only for doctor roles",
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  clinicId: true,
  createdAt: true,
  lastVisit: true,
});


export const insertVisitSchema = createInsertSchema(visits).omit({
  id: true,
  clinicId: true,
  createdAt: true,
});

export const insertClinicalNotesSchema = createInsertSchema(clinicalNotes).omit({
  id: true,
  createdAt: true,
});

export const insertQueueSchema = createInsertSchema(queue).omit({
  id: true,
  createdAt: true,
});

// Enums for better type safety
export const visitTypeEnum = z.enum(['Consultation', 'Dental', 'Gynecology', 'Follow-up', 'Emergency']);
export const visitStatusEnum = z.enum(['Scheduled', 'In-Progress', 'Completed', 'Cancelled']);
export const queueStatusEnum = z.enum(['waiting', 'serving', 'completed', 'skipped', 'cancelled']);
export const userRoleEnum = z.enum(['admin', 'head_doctor', 'doctor', 'receptionist', 'user']);

// Types
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinics.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDoctorUser = z.infer<typeof insertDoctorUserSchema>;
export type User = typeof users.$inferSelect;
export type UserWithClinic = User & { clinic: Clinic };
export type Admin = typeof admins.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;


export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

export type InsertClinicalNotes = z.infer<typeof insertClinicalNotesSchema>;
export type ClinicalNotes = typeof clinicalNotes.$inferSelect;

export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type Queue = typeof queue.$inferSelect;

export type VisitType = z.infer<typeof visitTypeEnum>;
export type VisitStatus = z.infer<typeof visitStatusEnum>;
export type QueueStatus = z.infer<typeof queueStatusEnum>;
export type UserRole = z.infer<typeof userRoleEnum>;
