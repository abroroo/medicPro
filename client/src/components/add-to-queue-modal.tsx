import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { Patient } from "@shared/schema";

interface AddToQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToQueueModal({ open, onOpenChange }: AddToQueueModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { search: searchQuery || undefined }],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/patients?search=${encodeURIComponent(searchQuery)}`
        : '/api/patients';
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: searchQuery.length > 2,
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


  const resetForm = () => {
    setSearchQuery("");
    setSelectedPatient(null);
  };

  const handleAddExistingPatient = () => {
    if (selectedPatient) {
      addToQueueMutation.mutate(selectedPatient.id);
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
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] mx-4 max-h-[90vh] overflow-y-auto">
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

          {/* No Selection Message */}
          {!selectedPatient && searchQuery.length <= 2 && (
            <div className="text-center p-4 text-muted-foreground">
              <p className="text-sm">Search for an existing patient to add to queue</p>
            </div>
          )}
          
          {searchQuery.length > 2 && filteredPatients.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              <p className="text-sm">No patients found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
