import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertDoctorSchema, insertVisitSchema, insertClinicalNotesSchema, insertQueueSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Patient routes
  app.get("/api/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const search = req.query.search as string;
      let patients;
      
      if (search) {
        patients = await storage.searchPatients(search, req.user!.id);
      } else {
        patients = await storage.getPatients(req.user!.id);
      }
      
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient({
        ...validatedData,
        clinicId: req.user!.id
      });
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  app.put("/api/patients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(id, validatedData, req.user!.id);
      
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

  app.delete("/api/patients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePatient(id, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Queue routes
  app.get("/api/queue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const queueItems = await storage.getTodayQueue(req.user!.id);
      res.json(queueItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue" });
    }
  });

  app.post("/api/queue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Extract visit data from request body
      const { patientId, doctorId, visitType, visitDate, chiefComplaint } = req.body;
      
      // Basic validation
      if (!patientId || !doctorId || !visitType || !visitDate) {
        return res.status(400).json({ 
          message: "Missing required fields: patientId, doctorId, visitType, visitDate" 
        });
      }

      const queueNumber = await storage.getNextQueueNumber(req.user!.id);
      
      // First create the visit
      const visit = await storage.createVisit({
        patientId,
        doctorId,
        visitDate,
        visitType,
        chiefComplaint: chiefComplaint || null,
        status: "Scheduled",
        clinicId: req.user!.id
      });

      // Then add to queue with visit ID
      const queueItem = await storage.addToQueue({
        clinicId: req.user!.id,
        patientId,
        doctorId,
        visitId: visit.id,
        visitType,
        queueNumber,
        status: "waiting"
      }, req.user!.id);
      
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

  app.put("/api/queue/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const queueItem = await storage.updateQueueStatus(id, status, req.user!.id);
      
      if (!queueItem) {
        return res.status(404).json({ message: "Queue item not found" });
      }
      
      res.json(queueItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update queue status" });
    }
  });

  app.get("/api/queue/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const stats = await storage.getQueueStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });

  app.get("/api/queue/current", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const current = await storage.getCurrentServing(req.user!.id);
      res.json(current || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current serving" });
    }
  });

  // Reports routes
  app.get("/api/reports/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { dateFrom, dateTo, patientName } = req.query;
      const patients = await storage.getPatientsReport(req.user!.id, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        patientName: patientName as string
      });
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient reports" });
    }
  });

  app.get("/api/reports/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const stats = await storage.getPatientStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient stats" });
    }
  });

  app.get("/api/reports/export", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { dateFrom, dateTo, patientName } = req.query;
      const patients = await storage.getPatientsReport(req.user!.id, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        patientName: patientName as string
      });
      
      const csvHeader = "Name,Phone,Age,Address,Emergency Contact,Notes,Created At,Last Visit\n";
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

  // Doctor routes
  app.get("/api/doctors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const doctors = await storage.getDoctors(req.user!.id);
      res.json(doctors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const doctor = await storage.getDoctor(id, req.user!.id);
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json(doctor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doctor" });
    }
  });

  app.post("/api/doctors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertDoctorSchema.parse(req.body);
      const doctor = await storage.createDoctor({
        ...validatedData,
        clinicId: req.user!.id
      });
      res.status(201).json(doctor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid doctor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  app.put("/api/doctors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDoctorSchema.partial().parse(req.body);
      const doctor = await storage.updateDoctor(id, validatedData, req.user!.id);
      
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

  app.delete("/api/doctors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDoctor(id, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete doctor" });
    }
  });

  // Visit routes
  app.get("/api/visits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const visits = await storage.getVisits(req.user!.id);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.get("/api/visits/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const visit = await storage.getVisit(id, req.user!.id);
      
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visit" });
    }
  });

  app.post("/api/visits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertVisitSchema.parse(req.body);
      const visit = await storage.createVisit({
        ...validatedData,
        clinicId: req.user!.id
      });
      res.status(201).json(visit);
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

  app.put("/api/visits/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertVisitSchema.partial().parse(req.body);
      const visit = await storage.updateVisit(id, validatedData, req.user!.id);
      
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

  app.delete("/api/visits/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVisit(id, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete visit" });
    }
  });

  // Clinical Notes routes
  app.get("/api/visits/:visitId/clinical-notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const visitId = parseInt(req.params.visitId);
      const clinicalNotes = await storage.getClinicalNotes(visitId, req.user!.id);
      res.json(clinicalNotes);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Visit not found')) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch clinical notes" });
    }
  });

  app.get("/api/clinical-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const clinicalNote = await storage.getClinicalNote(id, req.user!.id);
      
      if (!clinicalNote) {
        return res.status(404).json({ message: "Clinical note not found" });
      }
      
      res.json(clinicalNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clinical note" });
    }
  });

  app.post("/api/clinical-notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertClinicalNotesSchema.parse(req.body);
      const clinicalNote = await storage.createClinicalNote(validatedData, req.user!.id);
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

  app.put("/api/clinical-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClinicalNotesSchema.partial().parse(req.body);
      const clinicalNote = await storage.updateClinicalNote(id, validatedData, req.user!.id);
      
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

  app.delete("/api/clinical-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClinicalNote(id, req.user!.id);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
