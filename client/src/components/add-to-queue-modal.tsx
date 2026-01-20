import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { Patient, User } from "@shared/schema";

// Visit type keys mapped to their translation keys in visits.json
const visitTypeKeys = [
  { value: "Consultation", translationKey: "consultation" },
  { value: "Dental", translationKey: "dental" },
  { value: "Gynecology", translationKey: "gynecology" },
  { value: "Follow-up", translationKey: "followUp" },
  { value: "Emergency", translationKey: "emergency" },
] as const;

interface AddToQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const queueVisitSchema = z.object({
  patientId: z.number(),
  doctorId: z.number(),
  visitType: z.string().min(1, "Visit type is required"),
  visitDate: z.string().min(1, "Visit date is required").refine((date) => {
    const visitDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return visitDate >= today;
  }, "Visit date cannot be in the past"),
  chiefComplaint: z.string().optional(),
});

type QueueVisitData = z.infer<typeof queueVisitSchema>;

export function AddToQueueModal({ open, onOpenChange }: AddToQueueModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation(['queue', 'visits', 'common']);

  // Form for visit data
  const form = useForm<QueueVisitData>({
    resolver: zodResolver(queueVisitSchema),
    defaultValues: {
      patientId: undefined,
      doctorId: undefined,
      visitType: "",
      visitDate: new Date().toISOString().split('T')[0], // Default to today
      chiefComplaint: "",
    },
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { search: searchQuery || undefined }],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/patients?search=${encodeURIComponent(searchQuery)}`
        : '/api/patients';
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: searchQuery.length > 2,
  });

  // Fetch doctors for visit assignment
  const { data: doctors = [] } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "doctor" }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users?role=doctor");
      return res.json();
    },
    enabled: open,
  });


  const addToQueueMutation = useMutation({
    mutationFn: async (visitData: QueueVisitData) => {
      // Send visit data to backend - it will create visit and add to queue
      const res = await apiRequest("POST", "/api/queue", visitData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: t('common:messages.success'),
        description: t('queue:toast.addedToQueue'),
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: t('common:messages.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const resetForm = () => {
    setSearchQuery("");
    setSelectedPatient(null);
    form.reset({
      patientId: undefined,
      doctorId: undefined,
      visitType: "",
      visitDate: new Date().toISOString().split('T')[0],
      chiefComplaint: "",
    });
  };

  const handleAddToQueue = (data: QueueVisitData) => {
    if (selectedPatient) {
      const visitData = {
        ...data,
        patientId: selectedPatient.id,
      };
      addToQueueMutation.mutate(visitData);
    }
  };


  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    form.setValue("patientId", patient.id);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('queue:addModal.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Existing Patient */}
          <div>
            <Label>{t('queue:addModal.searchExisting')}</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('queue:addModal.searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedPatient(null);
                }}
                data-testid="input-search-queue-patients"
              />
            </div>
            
            {/* Search Results */}
            {searchQuery.length > 2 && filteredPatients.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto border border-border rounded-md">
                {filteredPatients.slice(0, 5).map((patient) => (
                  <button
                    key={patient.id}
                    className="w-full text-left p-2 hover:bg-accent transition-colors"
                    onClick={() => handlePatientSelect(patient)}
                    data-testid={`patient-result-${patient.id}`}
                  >
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-muted-foreground">{patient.phone}</div>
                  </button>
                ))}
              </div>
            )}

            {selectedPatient && (
              <div className="mt-2 p-3 bg-accent rounded-md">
                <div className="font-medium">{selectedPatient.name}</div>
                <div className="text-sm text-muted-foreground">{selectedPatient.phone}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('queue:addModal.selectedPatient')}</p>
              </div>
            )}
          </div>

          {/* Visit Form - Only show when patient is selected */}
          {selectedPatient && (
            <form onSubmit={form.handleSubmit(handleAddToQueue)} className="space-y-4">
              
              {/* Doctor Selection */}
              <div className="space-y-2">
                <Label htmlFor="doctorId">{t('visits:form.doctor')} *</Label>
                <Select
                  value={form.watch("doctorId")?.toString() || ""}
                  onValueChange={(value) => form.setValue("doctorId", parseInt(value))}
                >
                  <SelectTrigger data-testid="select-doctor">
                    <SelectValue placeholder={t('visits:form.selectDoctor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.doctorId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.doctorId.message}
                  </p>
                )}
              </div>

              {/* Visit Type */}
              <div className="space-y-2">
                <Label htmlFor="visitType">{t('visits:form.visitType')} *</Label>
                <Select
                  value={form.watch("visitType") || ""}
                  onValueChange={(value) => form.setValue("visitType", value)}
                >
                  <SelectTrigger data-testid="select-visit-type">
                    <SelectValue placeholder={t('visits:form.selectVisitType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {visitTypeKeys.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(`visits:types.${type.translationKey}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.visitType && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.visitType.message}
                  </p>
                )}
              </div>

              {/* Visit Date */}
              <div className="space-y-2">
                <Label htmlFor="visitDate">{t('visits:form.visitDate')} *</Label>
                <Input
                  id="visitDate"
                  type="date"
                  {...form.register("visitDate")}
                  data-testid="input-visit-date"
                />
                {form.formState.errors.visitDate && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.visitDate.message}
                  </p>
                )}
              </div>

              {/* Chief Complaint */}
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">{t('visits:form.chiefComplaint')}</Label>
                <Input
                  id="chiefComplaint"
                  placeholder={t('visits:form.reasonPlaceholder')}
                  {...form.register("chiefComplaint")}
                  data-testid="input-chief-complaint"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={addToQueueMutation.isPending}
                  data-testid="button-schedule-and-queue"
                >
                  {addToQueueMutation.isPending ? t('common:messages.saving') : t('queue:addModal.scheduleAndQueue')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-queue"
                >
                  {t('common:buttons.cancel')}
                </Button>
              </div>
            </form>
          )}
          
          {/* No Selection Message */}
          {!selectedPatient && searchQuery.length <= 2 && (
            <div className="text-center p-4 text-muted-foreground">
              <p className="text-sm">{t('queue:addModal.searchHelp')}</p>
            </div>
          )}

          {searchQuery.length > 2 && filteredPatients.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              <p className="text-sm">{t('queue:addModal.noPatients')}</p>
              <p className="text-xs mt-1">{t('queue:addModal.tryDifferent')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
