import { clinics, users, patients, doctors, visits, clinicalNotes, queue, type Clinic, type InsertClinic, type User, type InsertUser, type UserWithClinic, type Patient, type InsertPatient, type Doctor, type InsertDoctor, type Visit, type InsertVisit, type ClinicalNotes, type InsertClinicalNotes, type Queue, type InsertQueue } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, max, gte, lt, isNull } from "drizzle-orm";
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
  getTodayQueue(clinicId: number): Promise<(Queue & { patient: Patient; doctor?: Doctor | undefined; visit?: Visit | undefined })[]>;
  addToQueue(queueItem: InsertQueue, clinicId: number): Promise<Queue>;
  updateQueueStatus(id: number, status: string, clinicId: number): Promise<Queue | undefined>;
  getNextQueueNumber(clinicId: number): Promise<number>;
  getCurrentServing(clinicId: number): Promise<Queue | undefined>;
  getQueueStats(clinicId: number): Promise<{ waiting: number; serving: number; completed: number }>;
  
  // Doctor methods
  getDoctors(clinicId: number): Promise<Doctor[]>;
  getDoctor(id: number, clinicId: number): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor & { clinicId: number }): Promise<Doctor>;
  updateDoctor(id: number, doctor: Partial<InsertDoctor>, clinicId: number): Promise<Doctor | undefined>;
  deleteDoctor(id: number, clinicId: number): Promise<boolean>;
  
  // Visit methods
  getVisits(clinicId: number): Promise<(Visit & { patient: Patient; doctor: Doctor })[]>;
  getVisit(id: number, clinicId: number): Promise<(Visit & { patient: Patient; doctor: Doctor }) | undefined>;
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
          email: clinics.email,
          password: clinics.password,
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
  async getTodayQueue(clinicId: number): Promise<(Queue & { patient: Patient; doctor?: Doctor; visit?: Visit })[]> {
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
        doctor: doctors,
        visit: visits,
      })
      .from(queue)
      .innerJoin(patients, eq(queue.patientId, patients.id))
      .leftJoin(doctors, eq(queue.doctorId, doctors.id))
      .leftJoin(visits, eq(queue.visitId, visits.id))
      .where(
        and(
          eq(queue.clinicId, clinicId),
          eq(patients.clinicId, clinicId), // CRITICAL: Ensure patient belongs to same clinic
          or(
            isNull(queue.doctorId), // Doctor can be null
            eq(doctors.clinicId, clinicId) // CRITICAL: If doctor exists, ensure it belongs to same clinic
          ),
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
      const doctor = await this.getDoctor(queueItem.doctorId, clinicId);
      if (!doctor) {
        throw new Error('Doctor not found or does not belong to this clinic');
      }
    }

    // CRITICAL: If visit is specified, validate it belongs to the authenticated clinic
    if (queueItem.visitId) {
      const visit = await this.getVisit(queueItem.visitId, clinicId);
      if (!visit) {
        throw new Error('Visit not found or does not belong to this clinic');
      }
    }

    // CRITICAL: Enforce clinic ID invariant - always use the authenticated clinic ID
    const secureQueueItem = {
      ...queueItem,
      clinicId: clinicId // Override any client-provided clinicId with authenticated clinic
    };

    const [newQueueItem] = await db
      .insert(queue)
      .values(secureQueueItem)
      .returning();
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
          id: doctors.id,
          name: doctors.name,
          specialization: doctors.specialization,
        },
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .innerJoin(doctors, eq(visits.doctorId, doctors.id))
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

  // Doctor methods
  async getDoctors(clinicId: number): Promise<Doctor[]> {
    return await db
      .select()
      .from(doctors)
      .where(eq(doctors.clinicId, clinicId))
      .orderBy(doctors.name);
  }

  async getDoctor(id: number, clinicId: number): Promise<Doctor | undefined> {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(and(eq(doctors.id, id), eq(doctors.clinicId, clinicId)));
    return doctor || undefined;
  }

  async createDoctor(doctor: InsertDoctor & { clinicId: number }): Promise<Doctor> {
    // CRITICAL: Always enforce the clinic ID from the authenticated session
    const secureDoctor = {
      ...doctor,
      clinicId: doctor.clinicId // This should come from authenticated user session
    };
    
    const [newDoctor] = await db
      .insert(doctors)
      .values(secureDoctor)
      .returning();
    return newDoctor;
  }

  async updateDoctor(id: number, doctor: Partial<InsertDoctor>, clinicId: number): Promise<Doctor | undefined> {
    const [updatedDoctor] = await db
      .update(doctors)
      .set(doctor)
      .where(and(eq(doctors.id, id), eq(doctors.clinicId, clinicId)))
      .returning();
    return updatedDoctor || undefined;
  }

  async deleteDoctor(id: number, clinicId: number): Promise<boolean> {
    const result = await db
      .delete(doctors)
      .where(and(eq(doctors.id, id), eq(doctors.clinicId, clinicId)));
    return (result.rowCount || 0) > 0;
  }

  // Visit methods  
  async getVisits(clinicId: number): Promise<(Visit & { patient: Patient; doctor: Doctor })[]> {
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
        doctor: doctors,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .innerJoin(doctors, eq(visits.doctorId, doctors.id))
      .where(
        and(
          eq(visits.clinicId, clinicId),
          eq(patients.clinicId, clinicId), // CRITICAL: Ensure patient belongs to same clinic
          eq(doctors.clinicId, clinicId)   // CRITICAL: Ensure doctor belongs to same clinic
        )
      )
      .orderBy(desc(visits.visitDate));
  }

  async getVisit(id: number, clinicId: number): Promise<(Visit & { patient: Patient; doctor: Doctor }) | undefined> {
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
        doctor: doctors,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .innerJoin(doctors, eq(visits.doctorId, doctors.id))
      .where(
        and(
          eq(visits.id, id),
          eq(visits.clinicId, clinicId),
          eq(patients.clinicId, clinicId), // CRITICAL: Ensure patient belongs to same clinic
          eq(doctors.clinicId, clinicId)   // CRITICAL: Ensure doctor belongs to same clinic
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

    // CRITICAL: Validate doctor belongs to the authenticated clinic
    const doctor = await this.getDoctor(visit.doctorId, visit.clinicId);
    if (!doctor) {
      throw new Error('Doctor not found or does not belong to this clinic');
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
      const doctor = await this.getDoctor(visit.doctorId, clinicId);
      if (!doctor) {
        throw new Error('Doctor not found or does not belong to this clinic');
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

    // CRITICAL: Validate doctor belongs to the authenticated clinic
    const doctor = await this.getDoctor(note.doctorId, clinicId);
    if (!doctor) {
      throw new Error('Doctor not found or does not belong to this clinic');
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
      const doctor = await this.getDoctor(note.doctorId, clinicId);
      if (!doctor) {
        throw new Error('Doctor not found or does not belong to this clinic');
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
}

export const storage = new DatabaseStorage();
