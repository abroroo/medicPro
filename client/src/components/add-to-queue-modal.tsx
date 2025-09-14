import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { Patient, InsertPatient } from "@shared/schema";

interface AddToQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToQueueModal({ open, onOpenChange }: AddToQueueModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients", searchQuery],
    enabled: searchQuery.length > 2,
  });

  const form = useForm<{ name: string; phone: string }>({
    defaultValues: { name: "", phone: "" },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const res = await apiRequest("POST", "/api/queue", { patientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Success",
        description: "Patient added to queue successfully",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAndAddPatientMutation = useMutation({
    mutationFn: async (patientData: { name: string; phone: string }) => {
      // Create patient first
      const createRes = await apiRequest("POST", "/api/patients", patientData);
      const newPatient = await createRes.json();
      
      // Then add to queue
      const queueRes = await apiRequest("POST", "/api/queue", { patientId: newPatient.id });
      return queueRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "New patient created and added to queue",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSearchQuery("");
    setSelectedPatient(null);
    form.reset();
  };

  const handleAddExistingPatient = () => {
    if (selectedPatient) {
      addToQueueMutation.mutate(selectedPatient.id);
    }
  };

  const handleQuickAdd = (data: { name: string; phone: string }) => {
    if (data.name && data.phone) {
      createAndAddPatientMutation.mutate(data);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Patient to Queue</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Existing Patient */}
          <div>
            <Label>Search Existing Patient</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or phone..."
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
                <Button 
                  className="mt-2 w-full" 
                  onClick={handleAddExistingPatient}
                  disabled={addToQueueMutation.isPending}
                  data-testid="button-add-existing-to-queue"
                >
                  {addToQueueMutation.isPending ? "Adding..." : "Add to Queue"}
                </Button>
              </div>
            )}
          </div>

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">OR</span>
            </div>
          </div>

          {/* Quick Add New */}
          <div>
            <Label>Quick Add New Patient</Label>
            <form onSubmit={form.handleSubmit(handleQuickAdd)} className="space-y-3 mt-1">
              <Input
                placeholder="Patient name"
                {...form.register("name", { required: true })}
                data-testid="input-quick-add-name"
              />
              <Input
                placeholder="Phone number"
                type="tel"
                {...form.register("phone", { required: true })}
                data-testid="input-quick-add-phone"
              />
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="submit"
                  className="flex-1"
                  disabled={createAndAddPatientMutation.isPending}
                  data-testid="button-quick-add-to-queue"
                >
                  {createAndAddPatientMutation.isPending ? "Adding..." : "Add to Queue"}
                </Button>
                <Button 
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-add-queue"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
