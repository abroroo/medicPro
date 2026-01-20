import { clinics, users, admins, patients, visits, clinicalNotes, queue, type Clinic, type InsertClinic, type User, type InsertUser, type UserWithClinic, type Admin, type Patient, type InsertPatient, type Visit, type InsertVisit, type ClinicalNotes, type InsertClinicalNotes, type Queue, type InsertQueue } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, max, gte, lt, isNull, count, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth methods (NEW: user-based auth)
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithClinic(id: number): Promise<UserWithClinic | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getClinicUsers(clinicId: number): Promise<User[]>;
  updateUserLastLogin(id: number): Promise<void>;

  // Admin methods
  getAdminById(id: number): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  updateAdminLastLogin(id: number): Promise<void>;
  getAllUsers(): Promise<(User & { clinicName: string })[]>;
  getAllClinics(): Promise<Clinic[]>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  createUserForClinic(user: InsertUser): Promise<User>;
  createDoctorUser(user: InsertUser): Promise<User>;
  deleteUser(id: number, clinicId: number): Promise<boolean>;
  hasUserVisitHistory(userId: number): Promise<boolean>;
  deactivateUser(id: number, clinicId: number): Promise<boolean>;

  // Legacy auth methods (clinic-based, for backward compatibility)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(email: string): Promise<User | undefined>;
  
  // Patient methods
  getPatients(clinicId: number): Promise<Patient[]>;
  getPatient(id: number, clinicId: number): Promise<Patient | undefined>;
  searchPatients(query: string, clinicId: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient & { clinicId: number }): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>, clinicId: number): Promise<Patient | undefined>;
  deletePatient(id: number, clinicId: number): Promise<boolean>;
  
  // Queue methods
  getTodayQueue(clinicId: number): Promise<(Queue & { patient: Patient; doctor?: User | undefined; visit?: Visit | undefined })[]>;
  addToQueue(queueItem: InsertQueue, clinicId: number): Promise<Queue>;
  updateQueueStatus(id: number, status: string, clinicId: number): Promise<Queue | undefined>;
  getNextQueueNumber(clinicId: number): Promise<number>;
  getCurrentServing(clinicId: number): Promise<Queue | undefined>;
  getQueueStats(clinicId: number): Promise<{ waiting: number; serving: number; completed: number }>;
  
  // User methods for doctor role filtering
  getDoctorUsers(clinicId: number): Promise<User[]>;
  getDoctorUser(id: number, clinicId: number): Promise<User | undefined>;
  
  // Visit methods
  getVisits(clinicId: number): Promise<(Visit & { patient: Patient; doctor: User })[]>;
  getVisit(id: number, clinicId: number): Promise<(Visit & { patient: Patient; doctor: User }) | undefined>;
  createVisit(visit: InsertVisit & { clinicId: number }): Promise<Visit>;
  updateVisit(id: number, visit: Partial<InsertVisit>, clinicId: number): Promise<Visit | undefined>;
  deleteVisit(id: number, clinicId: number): Promise<boolean>;
  
  // Clinical Notes methods
  getClinicalNotes(visitId: number, clinicId: number): Promise<ClinicalNotes[]>;
  getClinicalNote(id: number, clinicId: number): Promise<ClinicalNotes | undefined>;
  createClinicalNote(note: InsertClinicalNotes, clinicId: number): Promise<ClinicalNotes>;
  updateClinicalNote(id: number, note: Partial<InsertClinicalNotes>, clinicId: number): Promise<ClinicalNotes | undefined>;
  deleteClinicalNote(id: number, clinicId: number): Promise<boolean>;
  
  // Report methods
  getPatientsReport(clinicId: number, filters?: { dateFrom?: string; dateTo?: string; patientName?: string }): Promise<Patient[]>;
  getPatientStats(clinicId: number): Promise<{ total: number; thisMonth: number; thisWeek: number; today: number }>;

  // Dashboard chart data methods
  getVisitTrends(clinicId: number, days?: number): Promise<{ date: string; count: number }[]>;
  getVisitStatusDistribution(clinicId: number): Promise<{ status: string; count: number }[]>;
  getDoctorPerformance(clinicId: number): Promise<{ name: string; visits: number }[]>;
  getVisitTypeDistribution(clinicId: number): Promise<{ type: string; count: number }[]>;

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

  // Legacy auth methods (keeping for backward compatibility)
  async getUser(id: number): Promise<User | undefined> {
    return this.getUserById(id);
  }

  async getUserByUsername(email: string): Promise<User | undefined> {
    return this.getUserByEmail(email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return this.createUserForClinic(insertUser);
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUserWithClinic(id: number): Promise<UserWithClinic | undefined> {
    const [userWithClinic] = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        clinicId: users.clinicId,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
        clinic: {
          id: clinics.id,
          name: clinics.name,
          contactEmail: clinics.contactEmail,
          contactPhone: clinics.contactPhone,
          address: clinics.address,
          createdAt: clinics.createdAt,
        }
      })
      .from(users)
      .innerJoin(clinics, eq(users.clinicId, clinics.id))
      .where(eq(users.id, id));

    return userWithClinic as UserWithClinic;
  }

  async getClinicUsers(clinicId: number): Promise<User[]> {
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.clinicId, clinicId))
      .orderBy(users.createdAt);
    return allUsers;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  // Admin methods
  async getAdminById(id: number): Promise<Admin | undefined> {
    const result = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);
    return result[0];
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const result = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);
    return result[0];
  }

  async updateAdminLastLogin(id: number): Promise<void> {
    await db
      .update(admins)
      .set({ lastLogin: new Date() })
      .where(eq(admins.id, id));
  }

  async getAllUsers(): Promise<(User & { clinicName: string })[]> {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        clinicId: users.clinicId,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
        clinicName: clinics.name,
      })
      .from(users)
      .innerJoin(clinics, eq(users.clinicId, clinics.id))
      .orderBy(users.createdAt);
    return allUsers;
  }

  async getAllClinics(): Promise<Clinic[]> {
    const allClinics = await db
      .select()
      .from(clinics)
      .orderBy(clinics.createdAt);
    return allClinics;
  }

  async createClinic(clinic: InsertClinic): Promise<Clinic> {
    const [newClinic] = await db
      .insert(clinics)
      .values(clinic)
      .returning();
    return newClinic;
  }

  async createUserForClinic(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  // Enhanced user creation method specifically for doctor users
  async createDoctorUser(user: InsertUser): Promise<User> {
    // Validate that this is a doctor or head_doctor role
    if (user.role !== 'doctor' && user.role !== 'head_doctor') {
      throw new Error('This method is only for creating doctor users');
    }

    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async hasUserVisitHistory(userId: number): Promise<boolean> {
    const result = await db
      .select({ count: count() })
      .from(visits)
      .where(eq(visits.doctorId, userId));
    return (result[0]?.count || 0) > 0;
  }

  async deactivateUser(id: number, clinicId: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive: false })
      .where(and(eq(users.id, id), eq(users.clinicId, clinicId)));
    return (result.rowCount || 0) > 0;
  }

  async deleteUser(id: number, clinicId: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.clinicId, clinicId)));
    return (result.rowCount || 0) > 0;
  }

  // Patient methods
  async getPatients(clinicId: number): Promise<(Patient & { lastVisitType?: string })[]> {
    // First get all patients
    const allPatients = await db
      .select()
      .from(patients)
      .where(eq(patients.clinicId, clinicId))
      .orderBy(desc(patients.lastVisit));

    // For each patient, get their most recent visit type
    const patientsWithVisitType = await Promise.all(
      allPatients.map(async (patient) => {
        if (!patient.lastVisit) {
          return { ...patient, lastVisitType: undefined };
        }

        // Get the most recent visit for this patient
        const [latestVisit] = await db
          .select({ visitType: visits.visitType })
          .from(visits)
          .where(and(
            eq(visits.patientId, patient.id),
            eq(visits.clinicId, clinicId)
          ))
          .orderBy(desc(visits.createdAt))
          .limit(1);

        return {
          ...patient,
          lastVisitType: latestVisit?.visitType || undefined
        };
      })
    );

    return patientsWithVisitType;
  }

  async getPatient(id: number, clinicId: number): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)));
    return patient || undefined;
  }

  async searchPatients(query: string, clinicId: number): Promise<(Patient & { lastVisitType?: string })[]> {
    // First get matching patients
    const matchingPatients = await db
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

    // For each patient, get their most recent visit type
    const patientsWithVisitType = await Promise.all(
      matchingPatients.map(async (patient) => {
        if (!patient.lastVisit) {
          return { ...patient, lastVisitType: undefined };
        }

        // Get the most recent visit for this patient
        const [latestVisit] = await db
          .select({ visitType: visits.visitType })
          .from(visits)
          .where(and(
            eq(visits.patientId, patient.id),
            eq(visits.clinicId, clinicId)
          ))
          .orderBy(desc(visits.createdAt))
          .limit(1);

        return {
          ...patient,
          lastVisitType: latestVisit?.visitType || undefined
        };
      })
    );

    return patientsWithVisitType;
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
  async getTodayQueue(clinicId: number): Promise<(Queue & { patient: Patient; doctor?: User; visit?: Visit })[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const results = await db
      .select({
        id: queue.id,
        clinicId: queue.clinicId,
        patientId: queue.patientId,
        doctorId: queue.doctorId,
        visitId: queue.visitId,
        queueNumber: queue.queueNumber,
        visitType: queue.visitType,
        status: queue.status,
        createdAt: queue.createdAt,
        patient: patients,
        doctor: users,
        visit: visits,
      })
      .from(queue)
      .innerJoin(patients, eq(queue.patientId, patients.id))
      .leftJoin(users, and(eq(queue.doctorId, users.id), eq(users.clinicId, clinicId)))
      .leftJoin(visits, eq(queue.visitId, visits.id))
      .where(
        and(
          eq(queue.clinicId, clinicId),
          eq(patients.clinicId, clinicId), // CRITICAL: Ensure patient belongs to same clinic
          or(
            isNull(queue.visitId), // Visit can be null
            eq(visits.clinicId, clinicId) // CRITICAL: If visit exists, ensure it belongs to same clinic
          ),
          and(
            gte(queue.createdAt, startOfDay),
            lt(queue.createdAt, endOfDay)
          )
        )
      )
      .orderBy(queue.queueNumber);

    // Transform null values to undefined for TypeScript compatibility
    return results.map(result => ({
      ...result,
      doctor: result.doctor || undefined,
      visit: result.visit || undefined,
    }));
  }

  async addToQueue(queueItem: InsertQueue, clinicId: number): Promise<Queue> {
    // CRITICAL: Verify patient belongs to the authenticated clinic before adding to queue
    const patient = await this.getPatient(queueItem.patientId, clinicId);
    if (!patient) {
      throw new Error('Patient not found or does not belong to this clinic');
    }

    // CRITICAL: If doctor is specified, validate it belongs to the authenticated clinic
    if (queueItem.doctorId) {
      const doctor = await this.getDoctorUser(queueItem.doctorId, clinicId);
      if (!doctor) {
        throw new Error('Doctor user not found or does not belong to this clinic');
      }
    }

    // CRITICAL: If visit is specified, validate it belongs to the authenticated clinic
    if (queueItem.visitId) {
      const visit = await this.getVisit(queueItem.visitId, clinicId);
      if (!visit) {
        throw new Error('Visit not found or does not belong to this clinic');
      }
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Use transaction for atomic operation
    const [newQueueItem] = await db.transaction(async (tx) => {
      // Check for duplicate (same patient + same doctor + same day)
      // Build the where condition, handling null doctorId properly
      const doctorCondition = queueItem.doctorId
        ? eq(queue.doctorId, queueItem.doctorId)
        : isNull(queue.doctorId);

      const existingEntry = await tx
        .select()
        .from(queue)
        .where(
          and(
            eq(queue.clinicId, clinicId),
            eq(queue.patientId, queueItem.patientId),
            doctorCondition,
            gte(queue.createdAt, startOfDay),
            lt(queue.createdAt, endOfDay),
            or(eq(queue.status, 'waiting'), eq(queue.status, 'serving'))
          )
        )
        .limit(1);

      if (existingEntry.length > 0) {
        throw new Error('Patient already has an active queue entry with this doctor for today');
      }

      // Get next queue number within transaction
      const maxResult = await tx
        .select({ maxNumber: max(queue.queueNumber) })
        .from(queue)
        .where(
          and(
            eq(queue.clinicId, clinicId),
            gte(queue.createdAt, startOfDay),
            lt(queue.createdAt, endOfDay)
          )
        );

      const nextNumber = (maxResult[0]?.maxNumber || 0) + 1;

      return await tx
        .insert(queue)
        .values({
          ...queueItem,
          clinicId: clinicId,
          queueNumber: nextNumber
        })
        .returning();
    });

    return newQueueItem;
  }

  async updateQueueStatus(id: number, status: string, clinicId: number): Promise<Queue | undefined> {
    // First get the queue item to check if it has an associated visit
    const queueItem = await db
      .select()
      .from(queue)
      .where(and(eq(queue.id, id), eq(queue.clinicId, clinicId)))
      .limit(1);
    
    if (!queueItem.length) {
      return undefined;
    }

    const currentQueue = queueItem[0];

    // If queue is being skipped or cancelled, update associated visit status
    if ((status === 'skipped' || status === 'cancelled') && currentQueue.visitId) {
      await db
        .update(visits)
        .set({ status: 'Cancelled' })
        .where(and(eq(visits.id, currentQueue.visitId), eq(visits.clinicId, clinicId)));
    }

    // Update the queue status
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

  async getQueueStats(clinicId: number): Promise<{ waiting: number; serving: number; completed: number; skipped: number; cancelled: number }> {
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
      skipped: queueItems.filter(item => item.status === 'skipped').length,
      cancelled: queueItems.filter(item => item.status === 'cancelled').length,
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

  async getVisitsReport(clinicId: number, filters?: { 
    dateFrom?: string; 
    dateTo?: string; 
    patientName?: string;
    doctorId?: number;
    visitType?: string;
    status?: string;
  }): Promise<any[]> {
    let whereClause = eq(visits.clinicId, clinicId);
    
    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      whereClause = and(whereClause, gte(visits.visitDate, fromDate)) || whereClause;
    }
    
    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      whereClause = and(whereClause, lt(visits.visitDate, toDate)) || whereClause;
    }
    
    if (filters?.doctorId) {
      whereClause = and(whereClause, eq(visits.doctorId, filters.doctorId)) || whereClause;
    }
    
    if (filters?.visitType) {
      whereClause = and(whereClause, eq(visits.visitType, filters.visitType)) || whereClause;
    }
    
    if (filters?.status) {
      whereClause = and(whereClause, eq(visits.status, filters.status)) || whereClause;
    }
    
    const result = await db
      .select({
        id: visits.id,
        visitDate: visits.visitDate,
        visitType: visits.visitType,
        status: visits.status,
        chiefComplaint: visits.chiefComplaint,
        patient: {
          id: patients.id,
          name: patients.name,
          phone: patients.phone,
        },
        doctor: {
          id: users.id,
          name: users.firstName,
          lastName: users.lastName,
          specialization: users.specialization,
        },
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .innerJoin(users, eq(visits.doctorId, users.id))
      .where(whereClause)
      .orderBy(desc(visits.visitDate));
    
    // Add patient name filtering after database query if needed
    if (filters?.patientName) {
      return result.filter(v => 
        v.patient.name.toLowerCase().includes(filters.patientName!.toLowerCase())
      );
    }
    
    // Fetch clinical notes for each visit
    const visitsWithNotes = await Promise.all(
      result.map(async (visit) => {
        const notes = await db
          .select()
          .from(clinicalNotes)
          .where(eq(clinicalNotes.visitId, visit.id))
          .orderBy(desc(clinicalNotes.createdAt));
        
        return {
          ...visit,
          clinicalNotes: notes,
        };
      })
    );
    
    return visitsWithNotes;
  }
  
  async getVisitStats(clinicId: number): Promise<{ 
    total: number; 
    thisMonth: number; 
    thisWeek: number; 
    today: number;
    completed: number;
    scheduled: number;
    cancelled: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allVisits = await db
      .select()
      .from(visits)
      .where(eq(visits.clinicId, clinicId));
    
    return {
      total: allVisits.length,
      thisMonth: allVisits.filter(v => v.visitDate >= thisMonth).length,
      thisWeek: allVisits.filter(v => v.visitDate >= thisWeek).length,
      today: allVisits.filter(v => {
        const visitDate = new Date(v.visitDate);
        return visitDate.toDateString() === today.toDateString();
      }).length,
      completed: allVisits.filter(v => v.status === 'Completed').length,
      scheduled: allVisits.filter(v => v.status === 'Scheduled').length,
      cancelled: allVisits.filter(v => v.status === 'Cancelled').length,
    };
  }

  // User methods for doctor role filtering
  async getDoctorUsers(clinicId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.clinicId, clinicId),
        or(
          eq(users.role, 'doctor'),
          eq(users.role, 'head_doctor')
        )
      ))
      .orderBy(users.firstName, users.lastName);
  }

  async getDoctorUser(id: number, clinicId: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.clinicId, clinicId),
        or(
          eq(users.role, 'doctor'),
          eq(users.role, 'head_doctor')
        )
      ));
    return user || undefined;
  }

  // Visit methods
  async getVisits(clinicId: number): Promise<(Visit & { patient: Patient; doctor: User })[]> {
    return await db
      .select({
        id: visits.id,
        clinicId: visits.clinicId,
        patientId: visits.patientId,
        doctorId: visits.doctorId,
        visitDate: visits.visitDate,
        visitType: visits.visitType,
        chiefComplaint: visits.chiefComplaint,
        status: visits.status,
        createdAt: visits.createdAt,
        patient: patients,
        doctor: users,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .innerJoin(users, eq(visits.doctorId, users.id))
      .where(
        and(
          eq(visits.clinicId, clinicId),
          eq(patients.clinicId, clinicId), // CRITICAL: Ensure patient belongs to same clinic
          eq(users.clinicId, clinicId)     // CRITICAL: Ensure doctor user belongs to same clinic
        )
      )
      .orderBy(desc(visits.visitDate));
  }

  async getVisit(id: number, clinicId: number): Promise<(Visit & { patient: Patient; doctor: User }) | undefined> {
    const [visit] = await db
      .select({
        id: visits.id,
        clinicId: visits.clinicId,
        patientId: visits.patientId,
        doctorId: visits.doctorId,
        visitDate: visits.visitDate,
        visitType: visits.visitType,
        chiefComplaint: visits.chiefComplaint,
        status: visits.status,
        createdAt: visits.createdAt,
        patient: patients,
        doctor: users,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .innerJoin(users, eq(visits.doctorId, users.id))
      .where(
        and(
          eq(visits.id, id),
          eq(visits.clinicId, clinicId),
          eq(patients.clinicId, clinicId), // CRITICAL: Ensure patient belongs to same clinic
          eq(users.clinicId, clinicId)     // CRITICAL: Ensure doctor user belongs to same clinic
        )
      );
    return visit || undefined;
  }

  async createVisit(visit: InsertVisit & { clinicId: number }): Promise<Visit> {
    // CRITICAL: Validate patient belongs to the authenticated clinic
    const patient = await this.getPatient(visit.patientId, visit.clinicId);
    if (!patient) {
      throw new Error('Patient not found or does not belong to this clinic');
    }

    // CRITICAL: Validate doctor user belongs to the authenticated clinic
    const doctor = await this.getDoctorUser(visit.doctorId, visit.clinicId);
    if (!doctor) {
      throw new Error('Doctor user not found or does not belong to this clinic');
    }

    // CRITICAL: Enforce clinic ID invariant - always use the authenticated clinic ID
    const secureVisit = {
      ...visit,
      clinicId: visit.clinicId // Override any client-provided clinicId with authenticated clinic
    };

    const [newVisit] = await db
      .insert(visits)
      .values(secureVisit)
      .returning();

    // Update patient's lastVisit field
    await db
      .update(patients)
      .set({ lastVisit: new Date(newVisit.visitDate) })
      .where(and(eq(patients.id, visit.patientId), eq(patients.clinicId, visit.clinicId)));

    return newVisit;
  }

  // Utility function to update all patients' lastVisit field
  async updatePatientsLastVisit(clinicId: number): Promise<void> {
    // Get all patients for this clinic
    const allPatients = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.clinicId, clinicId));

    // For each patient, find their most recent visit and update their lastVisit field
    for (const patient of allPatients) {
      const [latestVisit] = await db
        .select({ visitDate: visits.visitDate, createdAt: visits.createdAt })
        .from(visits)
        .where(and(eq(visits.patientId, patient.id), eq(visits.clinicId, clinicId)))
        .orderBy(desc(visits.createdAt))
        .limit(1);

      if (latestVisit) {
        await db
          .update(patients)
          .set({ lastVisit: new Date(latestVisit.visitDate) })
          .where(and(eq(patients.id, patient.id), eq(patients.clinicId, clinicId)));
      }
    }
  }

  async updateVisit(id: number, visit: Partial<InsertVisit>, clinicId: number): Promise<Visit | undefined> {
    // If updating patient or doctor, validate they belong to the clinic
    if (visit.patientId) {
      const patient = await this.getPatient(visit.patientId, clinicId);
      if (!patient) {
        throw new Error('Patient not found or does not belong to this clinic');
      }
    }

    if (visit.doctorId) {
      const doctor = await this.getDoctorUser(visit.doctorId, clinicId);
      if (!doctor) {
        throw new Error('Doctor user not found or does not belong to this clinic');
      }
    }

    const [updatedVisit] = await db
      .update(visits)
      .set(visit)
      .where(and(eq(visits.id, id), eq(visits.clinicId, clinicId)))
      .returning();
    return updatedVisit || undefined;
  }

  async deleteVisit(id: number, clinicId: number): Promise<boolean> {
    const result = await db
      .delete(visits)
      .where(and(eq(visits.id, id), eq(visits.clinicId, clinicId)));
    return (result.rowCount || 0) > 0;
  }

  // Clinical Notes methods
  async getClinicalNotes(visitId: number, clinicId: number): Promise<ClinicalNotes[]> {
    // CRITICAL: First verify the visit belongs to the clinic
    const visit = await this.getVisit(visitId, clinicId);
    if (!visit) {
      throw new Error('Visit not found or does not belong to this clinic');
    }

    return await db
      .select()
      .from(clinicalNotes)
      .where(eq(clinicalNotes.visitId, visitId))
      .orderBy(desc(clinicalNotes.createdAt));
  }

  async getClinicalNote(id: number, clinicId: number): Promise<ClinicalNotes | undefined> {
    // CRITICAL: Use join to ensure note belongs to a visit that belongs to the clinic
    const [note] = await db
      .select({
        id: clinicalNotes.id,
        visitId: clinicalNotes.visitId,
        doctorId: clinicalNotes.doctorId,
        symptoms: clinicalNotes.symptoms,
        clinicalExamination: clinicalNotes.clinicalExamination,
        diagnosis: clinicalNotes.diagnosis,
        treatmentGiven: clinicalNotes.treatmentGiven,
        medications: clinicalNotes.medications,
        recommendations: clinicalNotes.recommendations,
        followUpDate: clinicalNotes.followUpDate,
        followUpNeeded: clinicalNotes.followUpNeeded,
        additionalNotes: clinicalNotes.additionalNotes,
        createdAt: clinicalNotes.createdAt,
      })
      .from(clinicalNotes)
      .innerJoin(visits, eq(clinicalNotes.visitId, visits.id))
      .where(
        and(
          eq(clinicalNotes.id, id),
          eq(visits.clinicId, clinicId) // CRITICAL: Ensure via visit's clinic
        )
      );
    return note || undefined;
  }

  async createClinicalNote(note: InsertClinicalNotes, clinicId: number): Promise<ClinicalNotes> {
    // CRITICAL: Validate visit belongs to the authenticated clinic
    const visit = await this.getVisit(note.visitId, clinicId);
    if (!visit) {
      throw new Error('Visit not found or does not belong to this clinic');
    }

    // CRITICAL: Validate doctor user belongs to the authenticated clinic
    const doctor = await this.getDoctorUser(note.doctorId, clinicId);
    if (!doctor) {
      throw new Error('Doctor user not found or does not belong to this clinic');
    }

    const [newNote] = await db
      .insert(clinicalNotes)
      .values(note)
      .returning();
    return newNote;
  }

  async updateClinicalNote(id: number, note: Partial<InsertClinicalNotes>, clinicId: number): Promise<ClinicalNotes | undefined> {
    // CRITICAL: First get the existing note to ensure it belongs to the clinic
    const existingNote = await this.getClinicalNote(id, clinicId);
    if (!existingNote) {
      throw new Error('Clinical note not found or does not belong to this clinic');
    }

    // If updating visit or doctor, validate they belong to the clinic
    if (note.visitId) {
      const visit = await this.getVisit(note.visitId, clinicId);
      if (!visit) {
        throw new Error('Visit not found or does not belong to this clinic');
      }
    }

    if (note.doctorId) {
      const doctor = await this.getDoctorUser(note.doctorId, clinicId);
      if (!doctor) {
        throw new Error('Doctor user not found or does not belong to this clinic');
      }
    }

    const [updatedNote] = await db
      .update(clinicalNotes)
      .set(note)
      .where(eq(clinicalNotes.id, id))
      .returning();
    return updatedNote || undefined;
  }

  async deleteClinicalNote(id: number, clinicId: number): Promise<boolean> {
    // CRITICAL: First verify the note belongs to the clinic via visit validation
    const existingNote = await this.getClinicalNote(id, clinicId);
    if (!existingNote) {
      throw new Error('Clinical note not found or does not belong to this clinic');
    }

    const result = await db
      .delete(clinicalNotes)
      .where(eq(clinicalNotes.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Dashboard chart data methods
  async getVisitTrends(clinicId: number, days: number = 30): Promise<{ date: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get all visits within the date range
    const visitsInRange = await db
      .select({
        visitDate: visits.visitDate,
      })
      .from(visits)
      .where(
        and(
          eq(visits.clinicId, clinicId),
          gte(visits.visitDate, startDateStr)
        )
      );

    // Group visits by date
    const dateCountMap = new Map<string, number>();

    // Initialize all dates in range with 0
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateCountMap.set(dateStr, 0);
    }

    // Count visits per date
    for (const visit of visitsInRange) {
      const dateStr = typeof visit.visitDate === 'string'
        ? visit.visitDate
        : new Date(visit.visitDate).toISOString().split('T')[0];
      dateCountMap.set(dateStr, (dateCountMap.get(dateStr) || 0) + 1);
    }

    // Convert to array sorted by date
    return Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getVisitStatusDistribution(clinicId: number): Promise<{ status: string; count: number }[]> {
    const allVisits = await db
      .select({ status: visits.status })
      .from(visits)
      .where(eq(visits.clinicId, clinicId));

    // Count by status
    const statusCounts = new Map<string, number>();
    for (const visit of allVisits) {
      statusCounts.set(visit.status, (statusCounts.get(visit.status) || 0) + 1);
    }

    return Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getDoctorPerformance(clinicId: number): Promise<{ name: string; visits: number }[]> {
    const doctorVisits = await db
      .select({
        doctorId: visits.doctorId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(visits)
      .innerJoin(users, eq(visits.doctorId, users.id))
      .where(
        and(
          eq(visits.clinicId, clinicId),
          eq(users.clinicId, clinicId)
        )
      );

    // Count visits per doctor
    const doctorCounts = new Map<number, { name: string; visits: number }>();
    for (const visit of doctorVisits) {
      const doctorName = `${visit.firstName} ${visit.lastName}`;
      const existing = doctorCounts.get(visit.doctorId);
      if (existing) {
        existing.visits += 1;
      } else {
        doctorCounts.set(visit.doctorId, { name: doctorName, visits: 1 });
      }
    }

    return Array.from(doctorCounts.values())
      .sort((a, b) => b.visits - a.visits);
  }

  async getVisitTypeDistribution(clinicId: number): Promise<{ type: string; count: number }[]> {
    const allVisits = await db
      .select({ visitType: visits.visitType })
      .from(visits)
      .where(eq(visits.clinicId, clinicId));

    // Count by type
    const typeCounts = new Map<string, number>();
    for (const visit of allVisits) {
      typeCounts.set(visit.visitType, (typeCounts.get(visit.visitType) || 0) + 1);
    }

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export const storage = new DatabaseStorage();
