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
  PlusCircle
} from "lucide-react";
import { Patient, Visit, ClinicalNotes, Doctor } from "@shared/schema";
import { VisitFormModal } from "@/components/visit-form-modal";

type VisitWithRelations = Visit & { patient: Patient; doctor: Doctor };

export default function PatientDetail() {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  
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

              {/* Emergency Contact */}
              {(patient.emergencyContactName || patient.emergencyContactPhone) && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Emergency Contact</p>
                  <div className="space-y-2">
                    {patient.emergencyContactName && (
                      <p className="text-sm" data-testid="patient-detail-emergency-name">
                        <strong>Name:</strong> {patient.emergencyContactName}
                      </p>
                    )}
                    {patient.emergencyContactPhone && (
                      <p className="text-sm" data-testid="patient-detail-emergency-phone">
                        <strong>Phone:</strong> {patient.emergencyContactPhone}
                      </p>
                    )}
                    {patient.emergencyContactRelation && (
                      <p className="text-sm" data-testid="patient-detail-emergency-relation">
                        <strong>Relation:</strong> {patient.emergencyContactRelation}
                      </p>
                    )}
                  </div>
                </div>
              )}

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
              <CardTitle className="flex items-center">
                <ClipboardList className="w-5 h-5 mr-2" />
                Medical Timeline
              </CardTitle>
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