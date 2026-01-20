import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertVisitSchema, InsertVisit, Visit, Patient, User } from "@shared/schema";

interface VisitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedPatientId?: number;
  visit?: Visit; // For edit functionality
}

// Visit type values (used for form submission) with their translation keys
const visitTypeConfig = [
  { value: "Consultation", translationKey: "types.consultation" },
  { value: "Dental", translationKey: "types.dental" },
  { value: "Gynecology", translationKey: "types.gynecology" },
  { value: "Follow-up", translationKey: "types.followUp" },
  { value: "Emergency", translationKey: "types.emergency" },
] as const;

export function VisitFormModal({
  open,
  onOpenChange,
  preSelectedPatientId,
  visit
}: VisitFormModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation(['visits', 'common']);
  
  const form = useForm<InsertVisit>({
    resolver: zodResolver(insertVisitSchema),
    defaultValues: {
      patientId: preSelectedPatientId || undefined,
      doctorId: undefined,
      visitDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      visitType: "",
      chiefComplaint: "",
      status: "Scheduled",
    },
  });

  // Reset form when visit data changes or modal opens
  useEffect(() => {
    if (open) {
      const formData = {
        patientId: preSelectedPatientId || visit?.patientId || undefined,
        doctorId: visit?.doctorId || undefined,
        visitDate: visit?.visitDate || new Date().toISOString().split('T')[0], // Default to today
        visitType: visit?.visitType || "",
        chiefComplaint: visit?.chiefComplaint || "",
        status: visit?.status || "Scheduled",
      };
      form.reset(formData);
    }
  }, [open, visit, preSelectedPatientId, form]);

  // Fetch patients for selection
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: open && !preSelectedPatientId, // Only fetch if no pre-selected patient
  });

  // Fetch doctors for selection
  const { data: doctors = [] } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "doctor" }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users?role=doctor");
      return res.json();
    },
    enabled: open,
  });

  const createVisitMutation = useMutation({
    mutationFn: async (data: InsertVisit) => {
      const res = await apiRequest("POST", "/api/visits", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
      if (preSelectedPatientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/visits", { patientId: preSelectedPatientId }] });
      }
      toast({
        title: t('common:messages.success'),
        description: t('visits:toast.scheduled'),
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common:messages.error'),
        description: error.message || t('visits:toast.error'),
        variant: "destructive",
      });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: async (data: Partial<InsertVisit>) => {
      const res = await apiRequest("PUT", `/api/visits/${visit!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      if (preSelectedPatientId || visit?.patientId) {
        const patientId = preSelectedPatientId || visit!.patientId;
        queryClient.invalidateQueries({ queryKey: ["/api/visits", { patientId }] });
      }
      toast({
        title: t('common:messages.success'),
        description: t('visits:toast.updated'),
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: t('common:messages.error'),
        description: error.message || t('visits:toast.error'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertVisit) => {
    if (visit) {
      updateVisitMutation.mutate(data);
    } else {
      createVisitMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="visit-form-title">
            {visit ? t('visits:form.editTitle') : t('visits:form.scheduleTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Patient Selection */}
          {!preSelectedPatientId && (
            <div className="space-y-2">
              <Label htmlFor="patientId">{t('visits:form.patient')} *</Label>
              <Select
                value={form.watch("patientId")?.toString() || ""}
                onValueChange={(value) => form.setValue("patientId", parseInt(value))}
              >
                <SelectTrigger data-testid="select-patient">
                  <SelectValue placeholder={t('visits:form.selectPatient')} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.patientId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.patientId.message}
                </p>
              )}
            </div>
          )}

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
                {visitTypeConfig.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(`visits:${type.translationKey}`)}
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

          {/* Visit Status - Read Only (managed by queue) */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('visits:form.status')}</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
              {t('visits:form.statusManaged', { status: form.watch("status") || t('visits:statuses.scheduled') })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('visits:form.statusHint')}
            </p>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint">{t('visits:form.chiefComplaint')}</Label>
            <Textarea
              id="chiefComplaint"
              rows={3}
              placeholder={t('visits:form.chiefComplaintPlaceholder')}
              {...form.register("chiefComplaint")}
              data-testid="input-chief-complaint"
            />
            {form.formState.errors.chiefComplaint && (
              <p className="text-sm text-destructive">
                {form.formState.errors.chiefComplaint.message}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-visit"
            >
              {t('common:buttons.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createVisitMutation.isPending || updateVisitMutation.isPending}
              data-testid="button-save-visit"
            >
              {createVisitMutation.isPending || updateVisitMutation.isPending
                ? t('common:messages.saving')
                : (visit ? t('common:buttons.update') : t('common:buttons.scheduleVisit'))
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}