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
import { insertUserSchema, type User, type InsertUser } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DoctorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor?: User | null;
}

export function DoctorFormModal({ open, onOpenChange, doctor }: DoctorFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!doctor;

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: doctor?.firstName || "",
      lastName: doctor?.lastName || "",
      email: doctor?.email || "",
      password: "",
      role: doctor?.role || "doctor",
      specialization: doctor?.specialization || "",
      cabinetNumber: doctor?.cabinetNumber || "",
      phone: doctor?.phone || "",
    },
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest("PUT", `/api/users/${doctor!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  const handleSubmit = (data: InsertUser) => {
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
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        password: "",
        role: doctor.role,
        specialization: doctor.specialization || "",
        cabinetNumber: doctor.cabinetNumber || "",
        phone: doctor.phone || "",
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "doctor",
        specialization: "",
        cabinetNumber: "",
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
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              {...form.register("firstName")}
              data-testid="input-doctor-first-name"
            />
            {form.formState.errors.firstName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              {...form.register("lastName")}
              data-testid="input-doctor-last-name"
            />
            {form.formState.errors.lastName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.lastName.message}
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@example.com"
              {...form.register("email")}
              data-testid="input-doctor-email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                {...form.register("password")}
                data-testid="input-doctor-password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={form.watch("role") || "doctor"}
              onValueChange={(value) => form.setValue("role", value as "doctor" | "head_doctor")}
            >
              <SelectTrigger data-testid="select-doctor-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="head_doctor">Head Doctor</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-destructive">
                {form.formState.errors.role.message}
              </p>
            )}
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