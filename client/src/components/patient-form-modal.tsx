import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPatientSchema, type Patient, type InsertPatient } from "@shared/schema";

interface PatientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

export function PatientFormModal({ open, onOpenChange, patient }: PatientFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!patient;

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: patient?.name || "",
      phone: patient?.phone || "",
      age: patient?.age || undefined,
      dateOfBirth: patient?.dateOfBirth || "",
      bloodType: patient?.bloodType || "",
      address: patient?.address || "",
      allergies: patient?.allergies || "",
      chronicConditions: patient?.chronicConditions || "",
      notes: patient?.notes || "",
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const res = await apiRequest("POST", "/api/patients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const res = await apiRequest("PUT", `/api/patients/${patient!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient updated successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertPatient) => {
    if (isEditing) {
      updatePatientMutation.mutate(data);
    } else {
      createPatientMutation.mutate(data);
    }
  };

  // Reset form when patient prop changes
  useEffect(() => {
    if (patient) {
      form.reset({
        name: patient.name,
        phone: patient.phone,
        age: patient.age || undefined,
        dateOfBirth: patient.dateOfBirth || "",
        bloodType: patient.bloodType || "",
        address: patient.address || "",
        allergies: patient.allergies || "",
        chronicConditions: patient.chronicConditions || "",
        notes: patient.notes || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        age: undefined,
        dateOfBirth: "",
        bloodType: "",
        address: "",
        allergies: "",
        chronicConditions: "",
        notes: "",
      });
    }
  }, [patient, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Patient" : "Add New Patient"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              data-testid="input-patient-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              {...form.register("phone")}
              data-testid="input-patient-phone"
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              {...form.register("age", { setValueAs: v => v === '' ? undefined : Number(v) })}
              data-testid="input-patient-age"
            />
            {form.formState.errors.age && (
              <p className="text-sm text-destructive">
                {form.formState.errors.age.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={2}
              {...form.register("address")}
              data-testid="input-patient-address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...form.register("dateOfBirth")}
              data-testid="input-patient-dob"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bloodType">Blood Type</Label>
            <Input
              id="bloodType"
              placeholder="e.g., A+, B-, O+, AB-"
              {...form.register("bloodType")}
              data-testid="input-patient-bloodtype"
            />
          </div>


          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              rows={2}
              placeholder="List any allergies to medications, foods, or environmental factors"
              {...form.register("allergies")}
              data-testid="input-patient-allergies"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chronicConditions">Chronic Conditions</Label>
            <Textarea
              id="chronicConditions"
              rows={2}
              placeholder="List any chronic medical conditions (diabetes, hypertension, etc.)"
              {...form.register("chronicConditions")}
              data-testid="input-patient-chronic-conditions"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              {...form.register("notes")}
              data-testid="input-patient-notes"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createPatientMutation.isPending || updatePatientMutation.isPending}
              data-testid="button-save-patient"
            >
              {createPatientMutation.isPending || updatePatientMutation.isPending
                ? "Saving..." 
                : isEditing 
                  ? "Update Patient" 
                  : "Add Patient"
              }
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-patient"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
