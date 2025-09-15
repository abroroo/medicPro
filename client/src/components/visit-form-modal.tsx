import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertVisitSchema, InsertVisit, Visit, Patient, Doctor } from "@shared/schema";

interface VisitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedPatientId?: number;
  visit?: Visit; // For edit functionality
}

const visitTypes = [
  "Consultation",
  "Dental", 
  "Gynecology",
  "Follow-up",
  "Emergency"
] as const;

const visitStatuses = [
  "Scheduled",
  "In-Progress", 
  "Completed",
  "Cancelled"
] as const;

export function VisitFormModal({ 
  open, 
  onOpenChange, 
  preSelectedPatientId,
  visit 
}: VisitFormModalProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertVisit>({
    resolver: zodResolver(insertVisitSchema),
    defaultValues: {
      patientId: preSelectedPatientId || undefined,
      doctorId: undefined,
      visitDate: "",
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
        visitDate: visit?.visitDate || "",
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
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
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
      if (preSelectedPatientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/visits", { patientId: preSelectedPatientId }] });
      }
      toast({
        title: "Success",
        description: "Visit scheduled successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule visit",
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
        title: "Success", 
        description: "Visit updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update visit",
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="visit-form-title">
            {visit ? "Edit Visit" : "Schedule New Visit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Patient Selection */}
          {!preSelectedPatientId && (
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient *</Label>
              <Select
                value={form.watch("patientId")?.toString() || ""}
                onValueChange={(value) => form.setValue("patientId", parseInt(value))}
              >
                <SelectTrigger data-testid="select-patient">
                  <SelectValue placeholder="Select a patient" />
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
            <Label htmlFor="doctorId">Doctor *</Label>
            <Select
              value={form.watch("doctorId")?.toString() || ""}
              onValueChange={(value) => form.setValue("doctorId", parseInt(value))}
            >
              <SelectTrigger data-testid="select-doctor">
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                    Dr. {doctor.name} - {doctor.specialization}
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
            <Label htmlFor="visitDate">Visit Date *</Label>
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
            <Label htmlFor="visitType">Visit Type *</Label>
            <Select
              value={form.watch("visitType") || ""}
              onValueChange={(value) => form.setValue("visitType", value)}
            >
              <SelectTrigger data-testid="select-visit-type">
                <SelectValue placeholder="Select visit type" />
              </SelectTrigger>
              <SelectContent>
                {visitTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
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

          {/* Visit Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status") || "Scheduled"}
              onValueChange={(value) => form.setValue("status", value)}
            >
              <SelectTrigger data-testid="select-visit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visitStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint">Chief Complaint</Label>
            <Textarea
              id="chiefComplaint"
              rows={3}
              placeholder="Describe the main reason for this visit..."
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
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createVisitMutation.isPending || updateVisitMutation.isPending}
              data-testid="button-save-visit"
            >
              {createVisitMutation.isPending || updateVisitMutation.isPending 
                ? "Saving..." 
                : (visit ? "Update Visit" : "Schedule Visit")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}