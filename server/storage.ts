import { clinics, patients, queue, type Clinic, type InsertClinic, type Patient, type InsertPatient, type Queue, type InsertQueue, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, max, gte, lt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth methods (clinic = user)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Patient methods
  getPatients(clinicId: number): Promise<Patient[]>;
  getPatient(id: number, clinicId: number): Promise<Patient | undefined>;
  searchPatients(query: string, clinicId: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient & { clinicId: number }): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>, clinicId: number): Promise<Patient | undefined>;
  deletePatient(id: number, clinicId: number): Promise<boolean>;
  
  // Queue methods
  getTodayQueue(clinicId: number): Promise<(Queue & { patient: Patient })[]>;
  addToQueue(queueItem: InsertQueue): Promise<Queue>;
  updateQueueStatus(id: number, status: string, clinicId: number): Promise<Queue | undefined>;
  getNextQueueNumber(clinicId: number): Promise<number>;
  getCurrentServing(clinicId: number): Promise<Queue | undefined>;
  getQueueStats(clinicId: number): Promise<{ waiting: number; serving: number; completed: number }>;
  
  // Report methods
  getPatientsReport(clinicId: number, filters?: { dateFrom?: string; dateTo?: string; patientName?: string }): Promise<Patient[]>;
  getPatientStats(clinicId: number): Promise<{ total: number; thisMonth: number; thisWeek: number; today: number }>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Auth methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(clinics).where(eq(clinics.id, id));
    return user || undefined;
  }

  async getUserByUsername(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(clinics).where(eq(clinics.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(clinics)
      .values({
        name: insertUser.username, // Map username to name for clinic
        email: insertUser.email,
        password: insertUser.password,
      })
      .returning();
    return user;
  }

  // Patient methods
  async getPatients(clinicId: number): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(eq(patients.clinicId, clinicId))
      .orderBy(desc(patients.lastVisit));
  }

  async getPatient(id: number, clinicId: number): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)));
    return patient || undefined;
  }

  async searchPatients(query: string, clinicId: number): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.clinicId, clinicId),
          or(
            ilike(patients.name, `%${query}%`),
            ilike(patients.phone, `%${query}%`)
          )
        )
      )
      .orderBy(desc(patients.lastVisit));
  }

  async createPatient(patient: InsertPatient & { clinicId: number }): Promise<Patient> {
    const [newPatient] = await db
      .insert(patients)
      .values(patient)
      .returning();
    return newPatient;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>, clinicId: number): Promise<Patient | undefined> {
    const [updatedPatient] = await db
      .update(patients)
      .set({ ...patient, lastVisit: new Date() })
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)))
      .returning();
    return updatedPatient || undefined;
  }

  async deletePatient(id: number, clinicId: number): Promise<boolean> {
    const result = await db
      .delete(patients)
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)));
    return (result.rowCount || 0) > 0;
  }

  // Queue methods
  async getTodayQueue(clinicId: number): Promise<(Queue & { patient: Patient })[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return await db
      .select({
        id: queue.id,
        clinicId: queue.clinicId,
        patientId: queue.patientId,
        queueNumber: queue.queueNumber,
        status: queue.status,
        createdAt: queue.createdAt,
        patient: patients,
      })
      .from(queue)
      .innerJoin(patients, eq(queue.patientId, patients.id))
      .where(
        and(
          eq(queue.clinicId, clinicId),
          and(
            gte(queue.createdAt, startOfDay),
            lt(queue.createdAt, endOfDay)
          )
        )
      )
      .orderBy(queue.queueNumber);
  }

  async addToQueue(queueItem: InsertQueue): Promise<Queue> {
    const [newQueueItem] = await db
      .insert(queue)
      .values(queueItem)
      .returning();
    return newQueueItem;
  }

  async updateQueueStatus(id: number, status: string, clinicId: number): Promise<Queue | undefined> {
    const [updatedQueue] = await db
      .update(queue)
      .set({ status })
      .where(and(eq(queue.id, id), eq(queue.clinicId, clinicId)))
      .returning();
    return updatedQueue || undefined;
  }

  async getNextQueueNumber(clinicId: number): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const result = await db
      .select({ maxNumber: max(queue.queueNumber) })
      .from(queue)
      .where(
        and(
          eq(queue.clinicId, clinicId),
          and(
            gte(queue.createdAt, startOfDay),
            lt(queue.createdAt, endOfDay)
          )
        )
      );
    
    return (result[0]?.maxNumber || 0) + 1;
  }

  async getCurrentServing(clinicId: number): Promise<Queue | undefined> {
    const [serving] = await db
      .select()
      .from(queue)
      .where(
        and(
          eq(queue.clinicId, clinicId),
          eq(queue.status, 'serving')
        )
      );
    return serving || undefined;
  }

  async getQueueStats(clinicId: number): Promise<{ waiting: number; serving: number; completed: number }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const queueItems = await db
      .select()
      .from(queue)
      .where(
        and(
          eq(queue.clinicId, clinicId),
          and(
            gte(queue.createdAt, startOfDay),
            lt(queue.createdAt, endOfDay)
          )
        )
      );
    
    return {
      waiting: queueItems.filter(item => item.status === 'waiting').length,
      serving: queueItems.filter(item => item.status === 'serving').length,
      completed: queueItems.filter(item => item.status === 'completed').length,
    };
  }

  // Report methods
  async getPatientsReport(clinicId: number, filters?: { dateFrom?: string; dateTo?: string; patientName?: string }): Promise<Patient[]> {
    let whereClause = eq(patients.clinicId, clinicId);
    
    if (filters?.patientName) {
      whereClause = and(whereClause, ilike(patients.name, `%${filters.patientName}%`)) || whereClause;
    }
    
    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      whereClause = and(whereClause, gte(patients.createdAt, fromDate)) || whereClause;
    }
    
    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo);
      // Add one day to include the entire 'to' date
      toDate.setDate(toDate.getDate() + 1);
      whereClause = and(whereClause, lt(patients.createdAt, toDate)) || whereClause;
    }
    
    return await db
      .select()
      .from(patients)
      .where(whereClause)
      .orderBy(desc(patients.lastVisit));
  }

  async getPatientStats(clinicId: number): Promise<{ total: number; thisMonth: number; thisWeek: number; today: number }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allPatients = await db
      .select()
      .from(patients)
      .where(eq(patients.clinicId, clinicId));
    
    return {
      total: allPatients.length,
      thisMonth: allPatients.filter(p => p.createdAt >= thisMonth).length,
      thisWeek: allPatients.filter(p => p.createdAt >= thisWeek).length,
      today: allPatients.filter(p => p.createdAt >= today).length,
    };
  }
}

export const storage = new DatabaseStorage();
