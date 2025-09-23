import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DoctorFormModal } from "@/components/doctor-form-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  UserPlus,
  Edit,
  Mail,
  Phone,
  Badge,
  Stethoscope,
  Settings
} from "lucide-react";
import { User } from "@shared/schema";

export default function Doctors() {
  const isMobile = useIsMobile();
  const { isAdmin, isHeadDoctor } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: doctors = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "doctor", search: searchQuery || undefined }],
    queryFn: async () => {
      const params = new URLSearchParams({ role: "doctor" });
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const res = await apiRequest("GET", `/api/users?${params}`);
      return res.json();
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (doctorId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${doctorId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Doctor deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // No need for client-side filtering since API handles search
  const filteredDoctors = doctors;

  const handleEditDoctor = (doctor: User) => {
    setEditingDoctor(doctor);
    setIsModalOpen(true);
  };

  const handleAddDoctor = () => {
    setEditingDoctor(null);
    setIsModalOpen(true);
  };

  const handleDeleteDoctor = (doctorId: number) => {
    if (confirm("Are you sure you want to delete this doctor? This action cannot be undone.")) {
      deleteDocMutation.mutate(doctorId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Doctors</h1>
            <p className="text-muted-foreground">Manage your clinic's medical staff</p>
          </div>
          {isHeadDoctor ? (
            <Button
              onClick={handleAddDoctor}
              size={isMobile ? "sm" : "default"}
              className="w-full sm:w-auto"
              data-testid="button-add-doctor"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Doctor
            </Button>
          ) : (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="w-full sm:w-auto"
              onClick={() => toast({
                title: "Admin Required",
                description: "Contact your administrator to add new doctors",
                variant: "destructive"
              })}
              data-testid="button-admin-required"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Required
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search doctors by name, specialty, or license..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-doctors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDoctors.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? "No doctors found" : "No doctors added yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? `No doctors match "${searchQuery}". Try a different search term.`
                  : "Add your first doctor to get started with medical staff management."
                }
              </p>
              {!searchQuery && isAdmin && (
                <Button
                  onClick={handleAddDoctor}
                  data-testid="button-add-first-doctor"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Doctor
                </Button>
              )}
              {!searchQuery && !isHeadDoctor && (
                <p className="text-sm text-muted-foreground mt-2">
                  Contact your administrator to add doctors.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Stethoscope className="w-5 h-5 mr-2 text-primary" />
                    <span data-testid={`text-doctor-name-${doctor.id}`}>
                      Dr. {doctor.firstName} {doctor.lastName}
                    </span>
                  </CardTitle>
                  <p className="text-sm text-primary font-medium" data-testid={`text-doctor-specialty-${doctor.id}`}>
                    {doctor.specialization}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {doctor.cabinetNumber && (
                      <div className="flex items-center text-muted-foreground">
                        <Badge className="w-4 h-4 mr-2" />
                        <span data-testid={`text-doctor-cabinet-${doctor.id}`}>
                          Cabinet: {doctor.cabinetNumber}
                        </span>
                      </div>
                    )}
                    {doctor.email && (
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2" />
                        <span data-testid={`text-doctor-email-${doctor.id}`}>
                          {doctor.email}
                        </span>
                      </div>
                    )}
                    {doctor.phone && (
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2" />
                        <span data-testid={`text-doctor-phone-${doctor.id}`}>
                          {doctor.phone}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    {isHeadDoctor ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDoctor(doctor)}
                          className="flex-1"
                          data-testid={`button-edit-doctor-${doctor.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          className="flex-1 text-destructive hover:text-destructive"
                          data-testid={`button-delete-doctor-${doctor.id}`}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast({
                          title: "Admin Required",
                          description: "Contact your administrator to modify doctor information",
                          variant: "destructive"
                        })}
                        className="flex-1"
                        data-testid={`button-admin-required-${doctor.id}`}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Admin Required
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DoctorFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        doctor={editingDoctor}
      />
    </div>
  );
}