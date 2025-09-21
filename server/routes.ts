import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertDoctorSchema, insertVisitSchema, insertClinicalNotesSchema, insertQueueSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { requireAuth, requireReceptionist, requireDoctor, requireAdmin } from "./middleware/rbac";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper function to map queue status to visit status
function mapQueueStatusToVisitStatus(queueStatus: string): string {
  switch (queueStatus) {
    case 'waiting':
      return 'Scheduled';
    case 'serving':
      return 'In-Progress';
    case 'completed':
      return 'Completed';
    case 'skipped':
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Scheduled';
  }
}

// Helper function to add no-cache headers
function addNoCacheHeaders(res: any) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Patient routes
  app.get("/api/patients", requireAuth, async (req, res) => {
    addNoCacheHeaders(res);
    try {
      const search = req.query.search as string;
      let patients;

      if (search) {
        patients = await storage.searchPatients(search, req.user!.clinicId);
      } else {
        patients = await storage.getPatients(req.user!.clinicId);
      }


      res.json(patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  // Get individual patient by ID
  app.get("/api/patients/:id", requireAuth, async (req, res) => {

    try {
      const patientId = parseInt(req.params.id);

      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }

      const patient = await storage.getPatient(patientId, req.user!.clinicId);

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json(patient);
    } catch (error) {
      console.error("Failed to fetch patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", requireReceptionist, async (req, res) => {
    
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient({
        ...validatedData,
        clinicId: req.user!.clinicId
      });
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  app.put("/api/patients/:id", requireReceptionist, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(id, validatedData, req.user!.clinicId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  app.delete("/api/patients/:id", requireAdmin, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePatient(id, req.user!.clinicId);
      
      if (!success) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Queue routes
  app.get("/api/queue", requireAuth, async (req, res) => {
    addNoCacheHeaders(res);
    try {
      const queueItems = await storage.getTodayQueue(req.user!.clinicId);

      // Implement hospital-standard queue ordering
      // Priority order: serving -> waiting (by queue number) -> completed/cancelled/skipped (by completion time)
      const sortedQueue = queueItems.sort((a, b) => {
        // 1. Currently serving patients always at the top
        if (a.status === 'serving' && b.status !== 'serving') return -1;
        if (b.status === 'serving' && a.status !== 'serving') return 1;

        // 2. Both serving: maintain queue number order
        if (a.status === 'serving' && b.status === 'serving') {
          return a.queueNumber - b.queueNumber;
        }

        // 3. Waiting patients: order by queue number (earliest first)
        if (a.status === 'waiting' && b.status === 'waiting') {
          return a.queueNumber - b.queueNumber;
        }

        // 4. Waiting patients come before completed ones
        if (a.status === 'waiting' && ['completed', 'cancelled', 'skipped'].includes(b.status)) return -1;
        if (b.status === 'waiting' && ['completed', 'cancelled', 'skipped'].includes(a.status)) return 1;

        // 5. Completed/cancelled/skipped: order by creation time (most recent first)
        if (['completed', 'cancelled', 'skipped'].includes(a.status) &&
            ['completed', 'cancelled', 'skipped'].includes(b.status)) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        // 6. Default fallback: maintain queue number order
        return a.queueNumber - b.queueNumber;
      });

      res.json(sortedQueue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue" });
    }
  });

  app.post("/api/queue", requireReceptionist, async (req, res) => {
    
    try {
      // Extract visit data from request body
      const { patientId, doctorId, visitType, visitDate, chiefComplaint } = req.body;
      
      // Basic validation
      if (!patientId || !doctorId || !visitType || !visitDate) {
        return res.status(400).json({ 
          message: "Missing required fields: patientId, doctorId, visitType, visitDate" 
        });
      }

      const queueNumber = await storage.getNextQueueNumber(req.user!.clinicId);
      
      // First create the visit
      const visit = await storage.createVisit({
        patientId,
        doctorId,
        visitDate,
        visitType,
        chiefComplaint: chiefComplaint || null,
        status: "Scheduled",
        clinicId: req.user!.clinicId
      });

      // Then add to queue with visit ID
      const queueItem = await storage.addToQueue({
        clinicId: req.user!.clinicId,
        patientId,
        doctorId,
        visitId: visit.id,
        visitType,
        queueNumber,
        status: "waiting"
      }, req.user!.clinicId);
      
      res.status(201).json({ 
        queueItem,
        visit
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      console.error("Queue creation error:", error);
      res.status(500).json({ message: "Failed to schedule visit and add to queue" });
    }
  });

  app.put("/api/queue/:id", requireReceptionist, async (req, res) => {

    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      // Validate status
      const validStatuses = ['waiting', 'serving', 'completed', 'skipped', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid queue status" });
      }

      // Update queue status
      const queueItem = await storage.updateQueueStatus(id, status, req.user!.clinicId);

      if (!queueItem) {
        return res.status(404).json({ message: "Queue item not found" });
      }

      // Automatically sync visit status based on queue status
      if (queueItem.visitId) {
        const visitStatus = mapQueueStatusToVisitStatus(status);
        await storage.updateVisit(queueItem.visitId, { status: visitStatus }, req.user!.clinicId);
      }

      res.json(queueItem);
    } catch (error) {
      console.error("Error updating queue status:", error);
      res.status(500).json({ message: "Failed to update queue status" });
    }
  });

  app.get("/api/queue/stats", requireAuth, async (req, res) => {
    
    try {
      const stats = await storage.getQueueStats(req.user!.clinicId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });

  app.get("/api/queue/current", requireAuth, async (req, res) => {
    
    try {
      const current = await storage.getCurrentServing(req.user!.clinicId);
      res.json(current || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current serving" });
    }
  });

  // Reports routes
  app.get("/api/reports/patients", requireAuth, async (req, res) => {
    addNoCacheHeaders(res);
    try {
      const { dateFrom, dateTo, patientName } = req.query;
      const patients = await storage.getPatientsReport(req.user!.clinicId, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        patientName: patientName as string
      });
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient reports" });
    }
  });

  app.get("/api/reports/stats", requireAuth, async (req, res) => {
    
    try {
      const stats = await storage.getPatientStats(req.user!.clinicId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient stats" });
    }
  });

  app.get("/api/reports/export", requireAuth, async (req, res) => {
    
    try {
      const { dateFrom, dateTo, patientName } = req.query;
      const patients = await storage.getPatientsReport(req.user!.clinicId, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        patientName: patientName as string
      });
      
      const csvHeader = "Name,Phone,Age,Address,Notes,Created At,Last Visit\n";
      const csvData = patients.map(p => 
        `"${p.name}","${p.phone}","${p.age || ''}","${p.address || ''}","${p.notes || ''}","${p.createdAt?.toISOString() || ''}","${p.lastVisit?.toISOString() || ''}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="patients-report.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Visit history reports
  app.get("/api/reports/visits", requireAuth, async (req, res) => {

    try {
      const { dateFrom, dateTo, patientName, doctorId, visitType, status } = req.query;
      const visits = await storage.getVisitsReport(req.user!.clinicId, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        patientName: patientName as string,
        doctorId: doctorId ? parseInt(doctorId as string) : undefined,
        visitType: visitType as string,
        status: status as string
      });
      res.json(visits);
    } catch (error) {
      console.error('Error in /api/reports/visits:', error);
      res.status(500).json({ message: "Failed to fetch visit reports" });
    }
  });

  app.get("/api/reports/visits/stats", requireAuth, async (req, res) => {
    
    try {
      const stats = await storage.getVisitStats(req.user!.clinicId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visit stats" });
    }
  });

  app.get("/api/reports/visits/export", requireAuth, async (req, res) => {
    
    try {
      const { dateFrom, dateTo, patientName, doctorId, visitType, status } = req.query;
      const visits = await storage.getVisitsReport(req.user!.clinicId, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        patientName: patientName as string,
        doctorId: doctorId ? parseInt(doctorId as string) : undefined,
        visitType: visitType as string,
        status: status as string
      });
      
      const csvHeader = "Date,Patient,Doctor,Visit Type,Status,Chief Complaint,Diagnosis,Treatment,Medications\n";
      const csvData = visits.map(v => {
        const diagnosis = v.clinicalNotes?.[0]?.diagnosis || '';
        const treatment = v.clinicalNotes?.[0]?.treatmentGiven || '';
        const medications = v.clinicalNotes?.[0]?.medications || '';
        return `"${new Date(v.visitDate).toLocaleDateString()}","${v.patient.name}","Dr. ${v.doctor.name}","${v.visitType}","${v.status}","${v.chiefComplaint || ''}","${diagnosis}","${treatment}","${medications}"`;
      }).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="visits-report.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export visit data" });
    }
  });

  // Doctor routes
  app.get("/api/doctors", requireAuth, async (req, res) => {
    addNoCacheHeaders(res);
    try {
      const doctors = await storage.getDoctors(req.user!.clinicId);
      res.json(doctors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/:id", requireAuth, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const doctor = await storage.getDoctor(id, req.user!.clinicId);
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json(doctor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doctor" });
    }
  });

  app.post("/api/doctors", requireAdmin, async (req, res) => {
    
    try {
      const validatedData = insertDoctorSchema.parse(req.body);
      const doctor = await storage.createDoctor({
        ...validatedData,
        clinicId: req.user!.clinicId
      });
      res.status(201).json(doctor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid doctor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  app.put("/api/doctors/:id", requireAdmin, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDoctorSchema.partial().parse(req.body);
      const doctor = await storage.updateDoctor(id, validatedData, req.user!.clinicId);
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json(doctor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid doctor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update doctor" });
    }
  });

  app.delete("/api/doctors/:id", requireAdmin, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDoctor(id, req.user!.clinicId);
      
      if (!success) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete doctor" });
    }
  });

  // Visit routes


  app.get("/api/visits", requireAuth, async (req, res) => {
    addNoCacheHeaders(res);
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      let visits = await storage.getVisits(req.user!.clinicId);

      // Filter by patient if patientId is provided
      if (patientId) {
        visits = visits.filter(visit => visit.patientId === patientId);
      }

      // Server-side sorting: most recent first (by creation date)
      visits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(visits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.get("/api/visits/:id", requireAuth, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const visit = await storage.getVisit(id, req.user!.clinicId);
      
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visit" });
    }
  });

  app.post("/api/visits", requireReceptionist, async (req, res) => {

    try {
      const validatedData = insertVisitSchema.parse(req.body);

      // First create the visit
      const visit = await storage.createVisit({
        ...validatedData,
        clinicId: req.user!.clinicId
      });

      // Then automatically add to queue (since visit and queue are 1:1)
      const queueNumber = await storage.getNextQueueNumber(req.user!.clinicId);
      const queueItem = await storage.addToQueue({
        clinicId: req.user!.clinicId,
        patientId: validatedData.patientId,
        doctorId: validatedData.doctorId,
        visitId: visit.id,
        visitType: validatedData.visitType,
        queueNumber,
        status: "waiting"
      }, req.user!.clinicId);

      res.status(201).json({
        visit,
        queueItem
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid visit data", errors: error.errors });
      }
      if (error instanceof Error && (error.message.includes('Patient not found') || error.message.includes('Doctor not found'))) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create visit" });
    }
  });

  app.put("/api/visits/:id", requireReceptionist, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertVisitSchema.partial().parse(req.body);
      const visit = await storage.updateVisit(id, validatedData, req.user!.clinicId);
      
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid visit data", errors: error.errors });
      }
      if (error instanceof Error && (error.message.includes('Patient not found') || error.message.includes('Doctor not found'))) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update visit" });
    }
  });

  app.delete("/api/visits/:id", requireAdmin, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVisit(id, req.user!.clinicId);
      
      if (!success) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete visit" });
    }
  });

  // Clinical Notes routes
  app.get("/api/visits/:visitId/clinical-notes", requireAuth, async (req, res) => {
    
    try {
      const visitId = parseInt(req.params.visitId);
      const clinicalNotes = await storage.getClinicalNotes(visitId, req.user!.clinicId);
      res.json(clinicalNotes);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Visit not found')) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch clinical notes" });
    }
  });

  app.get("/api/clinical-notes/:id", requireAuth, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const clinicalNote = await storage.getClinicalNote(id, req.user!.clinicId);
      
      if (!clinicalNote) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      res.json(clinicalNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clinical note" });
    }
  });

  app.post("/api/clinical-notes", requireDoctor, async (req, res) => {
    
    try {
      const validatedData = insertClinicalNotesSchema.parse(req.body);
      const clinicalNote = await storage.createClinicalNote(validatedData, req.user!.clinicId);
      res.status(201).json(clinicalNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid clinical note data", errors: error.errors });
      }
      if (error instanceof Error && (error.message.includes('Visit not found') || error.message.includes('Doctor not found'))) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create clinical note" });
    }
  });

  app.put("/api/clinical-notes/:id", requireDoctor, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClinicalNotesSchema.partial().parse(req.body);
      const clinicalNote = await storage.updateClinicalNote(id, validatedData, req.user!.clinicId);
      
      if (!clinicalNote) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      res.json(clinicalNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid clinical note data", errors: error.errors });
      }
      if (error instanceof Error && (error.message.includes('Clinical note not found') || error.message.includes('Visit not found') || error.message.includes('Doctor not found'))) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update clinical note" });
    }
  });

  app.delete("/api/clinical-notes/:id", requireDoctor, async (req, res) => {
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClinicalNote(id, req.user!.clinicId);
      
      if (!success) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Clinical note not found')) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete clinical note" });
    }
  });

  // Clinic management routes (admin only)
  app.get("/api/clinics", requireAdmin, async (req, res) => {
    try {
      const clinics = await storage.getAllClinics();
      res.json(clinics);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({ message: "Failed to fetch clinics" });
    }
  });

  app.post("/api/clinics", requireAdmin, async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }

      const hashedPassword = await hashPassword(password);

      const clinic = await storage.createClinic({
        name,
        email,
        password: hashedPassword,
      });

      // Remove password from response for security
      const { password: _, ...clinicResponse } = clinic;
      res.status(201).json(clinicResponse);
    } catch (error) {
      console.error('Error creating clinic:', error);
      res.status(500).json({ message: "Failed to create clinic" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      // Admin can see all users from all clinics
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const { email, password, firstName, lastName, clinicId, role, isActive } = req.body;

      if (!email || !password || !firstName || !lastName || !clinicId || !role) {
        return res.status(400).json({ message: "Email, password, firstName, lastName, clinicId, and role are required" });
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await storage.createUserForClinic({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        clinicId,
        role,
        isActive: isActive !== undefined ? isActive : true,
      });

      // Remove password from response for security
      const { password: _, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserWithClinic(id);

      if (!user || user.clinicId !== req.user!.clinicId) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });


  // Migration route (temporary - for migrating remaining clinics)
  app.post("/api/migrate-clinics", requireAdmin, async (req, res) => {
    try {
      // First, let's see what clinics exist
      const clinics = await storage.db.select().from(storage.schema.clinics);
      console.log('Found clinics:', clinics);

      const migratedUsers = [];

      for (const clinic of clinics) {
        // Skip clinic_id = 1 as it's already migrated
        if (clinic.id === 1) continue;

        // Check if admin user already exists for this clinic
        const existingAdmin = await storage.getUserByEmail(clinic.email);
        if (existingAdmin) {
          console.log(`Admin already exists for clinic ${clinic.id}: ${clinic.email}`);
          continue;
        }

        // Extract first and last name from clinic name
        const nameParts = clinic.name.split(' ');
        const firstName = nameParts[0] || clinic.name;
        const lastName = nameParts[1] || 'Admin';

        // Create admin user for this clinic
        const newUser = await storage.db.insert(storage.schema.users).values({
          email: clinic.email,
          password: clinic.password, // Keep existing hashed password
          firstName: firstName,
          lastName: lastName,
          clinicId: clinic.id,
          role: 'admin',
          isActive: true,
          createdAt: clinic.createdAt,
          lastLogin: null,
        }).returning();

        migratedUsers.push(newUser[0]);
        console.log(`Created admin user for clinic ${clinic.id}: ${clinic.email}`);
      }

      res.json({
        message: `Successfully migrated ${migratedUsers.length} clinics to users`,
        migratedUsers: migratedUsers
      });

    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({
        message: "Migration failed",
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
