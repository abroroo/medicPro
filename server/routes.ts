import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertQueueSchema } from "@shared/schema";
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
      const { patientId } = req.body;
      const queueNumber = await storage.getNextQueueNumber(req.user!.id);
      
      const queueItem = await storage.addToQueue({
        clinicId: req.user!.id,
        patientId,
        queueNumber,
        status: "waiting"
      });
      
      res.status(201).json(queueItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to queue" });
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
        `"${p.name}","${p.phone}","${p.age || ''}","${p.address || ''}","${p.emergencyContact || ''}","${p.notes || ''}","${p.createdAt?.toISOString() || ''}","${p.lastVisit?.toISOString() || ''}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="patients-report.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
