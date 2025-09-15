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
import { insertDoctorSchema, type Doctor, type InsertDoctor } from "@shared/schema";

interface DoctorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor?: Doctor | null;
}

export function DoctorFormModal({ open, onOpenChange, doctor }: DoctorFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!doctor;

  const form = useForm<InsertDoctor>({
    resolver: zodResolver(insertDoctorSchema),
    defaultValues: {
      name: doctor?.name || "",
      specialization: doctor?.specialization || "",
      cabinetNumber: doctor?.cabinetNumber || "",
      email: doctor?.email || "",
      phone: doctor?.phone || "",
    },
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (data: InsertDoctor) => {
      const res = await apiRequest("POST", "/api/doctors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({
        title: "Success",
        description: "Doctor created successfully",
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

  const updateDoctorMutation = useMutation({
    mutationFn: async (data: InsertDoctor) => {
      const res = await apiRequest("PUT", `/api/doctors/${doctor!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({
        title: "Success",
        description: "Doctor updated successfully",
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

  const handleSubmit = (data: InsertDoctor) => {
    if (isEditing) {
      updateDoctorMutation.mutate(data);
    } else {
      createDoctorMutation.mutate(data);
    }
  };

  // Reset form when doctor prop changes
  useEffect(() => {
    if (doctor) {
      form.reset({
        name: doctor.name,
        specialization: doctor.specialization,
        cabinetNumber: doctor.cabinetNumber || "",
        email: doctor.email || "",
        phone: doctor.phone || "",
      });
    } else {
      form.reset({
        name: "",
        specialization: "",
        cabinetNumber: "",
        email: "",
        phone: "",
      });
    }
  }, [doctor, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Doctor" : "Add New Doctor"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              data-testid="input-doctor-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization *</Label>
            <Input
              id="specialization"
              placeholder="e.g., General Dentistry, Orthodontics, Oral Surgery"
              {...form.register("specialization")}
              data-testid="input-doctor-specialization"
            />
            {form.formState.errors.specialization && (
              <p className="text-sm text-destructive">
                {form.formState.errors.specialization.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cabinetNumber">Cabinet Number</Label>
            <Input
              id="cabinetNumber"
              placeholder="Office/cabinet number"
              {...form.register("cabinetNumber")}
              data-testid="input-doctor-cabinet"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@example.com"
              {...form.register("email")}
              data-testid="input-doctor-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Contact phone number"
              {...form.register("phone")}
              data-testid="input-doctor-phone"
            />
          </div>


          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createDoctorMutation.isPending || updateDoctorMutation.isPending}
              data-testid="button-save-doctor"
            >
              {createDoctorMutation.isPending || updateDoctorMutation.isPending
                ? "Saving..." 
                : isEditing 
                  ? "Update Doctor" 
                  : "Add Doctor"
              }
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-doctor"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}