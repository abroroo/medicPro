import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Calendar, 
  Phone, 
  Mail, 
  User, 
  Heart, 
  AlertTriangle,
  ClipboardList,
  FileText,
  Stethoscope,
  Clock,
  Edit,
  PlusCircle,
  Download,
  Printer
} from "lucide-react";
import { Patient, Visit, ClinicalNotes, Doctor } from "@shared/schema";
import { VisitFormModal } from "@/components/visit-form-modal";

type VisitWithRelations = Visit & { patient: Patient; doctor: Doctor };

// Security utility functions
const escapeCSVField = (field: string): string => {
  if (!field) return '';
  
  // Convert to string and handle null/undefined
  const strField = String(field);
  
  // Prevent CSV injection by prefixing dangerous characters
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  let escaped = strField;
  
  if (dangerousChars.some(char => escaped.startsWith(char))) {
    escaped = "'" + escaped;
  }
  
  // Escape double quotes by doubling them
  escaped = escaped.replace(/"/g, '""');
  
  // Wrap in quotes if contains comma, newline, or quote
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
    escaped = `"${escaped}"`;
  }
  
  return escaped;
};

const escapeHTML = (text: string): string => {
  if (!text) return '';
  
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export default function PatientDetail() {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);

  // Export and Print handlers
  const handleExportToCSV = () => {
    if (!patient || visits.length === 0) return;
    
    // Create comprehensive CSV content with all clinical notes
    const headers = ['Date', 'Visit Type', 'Doctor', 'Status', 'Chief Complaint', 'Note Date', 'Symptoms', 'Diagnosis', 'Treatment', 'Medications', 'Follow-up Date'];
    const rows: string[][] = [];
    
    visits.forEach(visit => {
      const visitNotes = allClinicalNotes.filter(note => note.visitId === visit.id);
      
      if (visitNotes.length === 0) {
        // Visit without clinical notes
        rows.push([
          escapeCSVField(new Date(visit.visitDate).toLocaleDateString()),
          escapeCSVField(visit.visitType),
          escapeCSVField(`Dr. ${visit.doctor.name}`),
          escapeCSVField(visit.status),
          escapeCSVField(visit.chiefComplaint || ''),
          escapeCSVField(''),
          escapeCSVField(''),
          escapeCSVField(''),
          escapeCSVField(''),
          escapeCSVField(''),
          escapeCSVField('')
        ]);
      } else {
        // Include all clinical notes for this visit
        visitNotes.forEach(note => {
          rows.push([
            escapeCSVField(new Date(visit.visitDate).toLocaleDateString()),
            escapeCSVField(visit.visitType),
            escapeCSVField(`Dr. ${visit.doctor.name}`),
            escapeCSVField(visit.status),
            escapeCSVField(visit.chiefComplaint || ''),
            escapeCSVField(new Date(note.createdAt).toLocaleDateString()),
            escapeCSVField(note.symptoms || ''),
            escapeCSVField(note.diagnosis || ''),
            escapeCSVField(note.treatmentGiven || ''),
            escapeCSVField(note.medications || ''),
            escapeCSVField(note.followUpDate ? new Date(note.followUpDate).toLocaleDateString() : '')
          ]);
        });
      }
    });
    
    // Convert to CSV with proper escaping
    const csvContent = [headers.map(escapeCSVField), ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    // Download file with escaped filename
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${escapeCSVField(patient.name).replace(/[^a-zA-Z0-9]/g, '_')}_medical_history.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrintHistory = () => {
    if (!patient || visits.length === 0) return;
    
    // Create printable content with HTML escaping for security
    const printContent = `
      <html>
        <head>
          <title>Medical History - ${escapeHTML(patient.name)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .patient-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
            .visit { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .visit-header { font-weight: bold; margin-bottom: 10px; color: #2563eb; }
            .visit-detail { margin: 5px 0; }
            .label { font-weight: bold; color: #666; }
            .notes { background: #f9f9f9; padding: 10px; margin: 10px 0; border-left: 4px solid #2563eb; }
            .print-date { text-align: right; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Medical History Report</h1>
            <h2>${escapeHTML(patient.name)}</h2>
          </div>
          
          <div class="patient-info">
            <div><span class="label">Phone:</span> ${escapeHTML(patient.phone)}</div>
            ${patient.age ? `<div><span class="label">Age:</span> ${escapeHTML(patient.age.toString())} years</div>` : ''}
            ${patient.dateOfBirth ? `<div><span class="label">Date of Birth:</span> ${escapeHTML(new Date(patient.dateOfBirth).toLocaleDateString())}</div>` : ''}
            ${patient.bloodType ? `<div><span class="label">Blood Type:</span> ${escapeHTML(patient.bloodType)}</div>` : ''}
            ${patient.allergies ? `<div><span class="label">Allergies:</span> ${escapeHTML(patient.allergies)}</div>` : ''}
            ${patient.chronicConditions ? `<div><span class="label">Chronic Conditions:</span> ${escapeHTML(patient.chronicConditions)}</div>` : ''}
          </div>
          
          <h3>Visit History</h3>
          ${visits.map(visit => {
            const visitNotes = allClinicalNotes.filter(note => note.visitId === visit.id);
            return `
              <div class="visit">
                <div class="visit-header">
                  ${escapeHTML(visit.visitType)} - ${escapeHTML(new Date(visit.visitDate).toLocaleDateString())}
                </div>
                <div class="visit-detail"><span class="label">Doctor:</span> Dr. ${escapeHTML(visit.doctor.name)}</div>
                <div class="visit-detail"><span class="label">Status:</span> ${escapeHTML(visit.status)}</div>
                ${visit.chiefComplaint ? `<div class="visit-detail"><span class="label">Chief Complaint:</span> ${escapeHTML(visit.chiefComplaint)}</div>` : ''}
                
                ${visitNotes.map(note => `
                  <div class="notes">
                    ${note.symptoms ? `<div><span class="label">Symptoms:</span> ${escapeHTML(note.symptoms)}</div>` : ''}
                    ${note.diagnosis ? `<div><span class="label">Diagnosis:</span> ${escapeHTML(note.diagnosis)}</div>` : ''}
                    ${note.treatmentGiven ? `<div><span class="label">Treatment:</span> ${escapeHTML(note.treatmentGiven)}</div>` : ''}
                    ${note.medications ? `<div><span class="label">Medications:</span> ${escapeHTML(note.medications)}</div>` : ''}
                    ${note.followUpNeeded && note.followUpDate ? `<div><span class="label">Follow-up:</span> ${escapeHTML(new Date(note.followUpDate).toLocaleDateString())}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
          
          <div class="print-date">
            Generated on: ${escapeHTML(new Date().toLocaleString())}
          </div>
        </body>
      </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };
  
  const patientId = parseInt(params.id || '0');

  // Fetch patient details
  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!patientId,
  });

  // Fetch patient visits
  const { data: visits = [], isLoading: visitsLoading } = useQuery<VisitWithRelations[]>({
    queryKey: ["/api/visits", { patientId }],
    queryFn: async () => {
      const res = await fetch(`/api/visits?patientId=${patientId}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!patientId,
  });

  // Fetch clinical notes for all visits
  const { data: allClinicalNotes = [], isLoading: notesLoading } = useQuery<ClinicalNotes[]>({
    queryKey: ["/api/clinical-notes", { patientId }],
    queryFn: async () => {
      const notes: ClinicalNotes[] = [];
      for (const visit of visits) {
        const res = await fetch(`/api/visits/${visit.id}/clinical-notes`, { credentials: "include" });
        if (res.ok) {
          const visitNotes = await res.json();
          notes.push(...visitNotes);
        }
      }
      return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: visits.length > 0,
  });

  const handleBack = () => {
    setLocation("/patients");
  };

  const handleNewVisit = () => {
    setEditingVisit(null);
    setIsVisitModalOpen(true);
  };

  const handleEditVisit = (visit: any) => {
    setEditingVisit(visit);
    setIsVisitModalOpen(true);
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="text-center py-8">Loading patient details...</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto p-4">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Patient not found</h2>
            <Button onClick={handleBack}>Back to Patients</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              data-testid="button-back-to-patients"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="patient-detail-name">
                {patient.name}
              </h1>
              <p className="text-muted-foreground">Medical Record</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              data-testid="button-edit-patient-detail"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Patient
            </Button>
            <Button 
              size={isMobile ? "sm" : "default"}
              onClick={handleNewVisit}
              data-testid="button-new-visit"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Visit
            </Button>
          </div>
        </div>

        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Patient Information Card */}
          <Card className={isMobile ? '' : 'lg:col-span-1'}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="flex items-center" data-testid="patient-detail-phone">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                    {patient.phone}
                  </p>
                </div>
                
                {patient.age && (
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p data-testid="patient-detail-age">{patient.age} years old</p>
                  </div>
                )}

                {patient.dateOfBirth && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="flex items-center" data-testid="patient-detail-dob">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {patient.bloodType && (
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Type</p>
                    <Badge variant="secondary" data-testid="patient-detail-blood-type">
                      {patient.bloodType}
                    </Badge>
                  </div>
                )}

                {patient.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="text-sm" data-testid="patient-detail-address">{patient.address}</p>
                  </div>
                )}
              </div>

              <Separator />


              {/* Medical Information */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Medical Information</p>
                
                {patient.allergies && (
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                      Allergies
                    </p>
                    <p className="text-sm text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300 p-2 rounded" 
                       data-testid="patient-detail-allergies">
                      {patient.allergies}
                    </p>
                  </div>
                )}

                {patient.chronicConditions && (
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Heart className="w-4 h-4 mr-2 text-red-500" />
                      Chronic Conditions
                    </p>
                    <p className="text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 p-2 rounded"
                       data-testid="patient-detail-chronic-conditions">
                      {patient.chronicConditions}
                    </p>
                  </div>
                )}

                {patient.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm" data-testid="patient-detail-notes">{patient.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medical Timeline */}
          <Card className={isMobile ? '' : 'lg:col-span-2'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2" />
                  Medical Timeline
                </CardTitle>
                {visits.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportToCSV}
                      data-testid="button-export-history"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintHistory}
                      data-testid="button-print-history"
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <div className="text-center py-4">Loading medical history...</div>
              ) : visits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No visits recorded</h3>
                  <p className="mb-4">This patient hasn't had any visits yet.</p>
                  <Button onClick={handleNewVisit} data-testid="button-first-visit">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Schedule First Visit
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {visits.map((visit) => {
                    const visitNotes = allClinicalNotes.filter(note => note.visitId === visit.id);
                    
                    return (
                      <div key={visit.id} className="border rounded-lg p-4 space-y-3" data-testid={`visit-${visit.id}`}>
                        {/* Visit Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <div>
                              <p className="font-medium" data-testid={`visit-type-${visit.id}`}>
                                {visit.visitType}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(visit.visitDate).toLocaleDateString()}
                                <Stethoscope className="w-4 h-4 ml-3 mr-1" />
                                Dr. {visit.doctor.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVisit(visit)}
                              data-testid={`button-edit-visit-${visit.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Badge 
                              variant={visit.status === 'Completed' ? 'default' : 'secondary'}
                              data-testid={`visit-status-${visit.id}`}
                            >
                              {visit.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Chief Complaint */}
                        {visit.chiefComplaint && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Chief Complaint</p>
                            <p className="text-sm" data-testid={`visit-complaint-${visit.id}`}>
                              {visit.chiefComplaint}
                            </p>
                          </div>
                        )}

                        {/* Clinical Notes */}
                        {visitNotes.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Clinical Notes</p>
                            {visitNotes.map((note) => (
                              <div key={note.id} className="bg-muted/50 p-3 rounded border-l-4 border-primary space-y-2"
                                   data-testid={`clinical-note-${note.id}`}>
                                {note.symptoms && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">Symptoms</p>
                                    <p className="text-sm">{note.symptoms}</p>
                                  </div>
                                )}
                                {note.diagnosis && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">Diagnosis</p>
                                    <p className="text-sm font-medium">{note.diagnosis}</p>
                                  </div>
                                )}
                                {note.treatmentGiven && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">Treatment</p>
                                    <p className="text-sm">{note.treatmentGiven}</p>
                                  </div>
                                )}
                                {note.medications && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">Medications</p>
                                    <p className="text-sm">{note.medications}</p>
                                  </div>
                                )}
                                {note.followUpNeeded && note.followUpDate && (
                                  <div className="flex items-center text-sm text-orange-600 dark:text-orange-400">
                                    <Clock className="w-4 h-4 mr-1" />
                                    Follow-up: {new Date(note.followUpDate).toLocaleDateString()}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(note.createdAt).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visit Form Modal */}
        <VisitFormModal
          open={isVisitModalOpen}
          onOpenChange={(open) => {
            setIsVisitModalOpen(open);
            if (!open) {
              setEditingVisit(null);
            }
          }}
          preSelectedPatientId={patientId}
          visit={editingVisit}
        />
      </div>
    </div>
  );
}