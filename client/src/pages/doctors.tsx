import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DoctorFormModal } from "@/components/doctor-form-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  UserPlus,
  Edit,
  Mail,
  Phone,
  Stethoscope,
  Settings,
  Building2
} from "lucide-react";
import { User } from "@shared/schema";

export default function Doctors() {
  const isMobile = useIsMobile();
  const { isAdmin, isHeadDoctor } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<User | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation(['doctors', 'common']);

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
        title: t('common:messages.success'),
        description: t('doctors:toast.deleted'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:messages.error'),
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
    if (confirm(t('common:messages.confirmDelete'))) {
      deleteDocMutation.mutate(doctorId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('doctors:title')}</h1>
            <p className="text-muted-foreground">{t('doctors:subtitle')}</p>
          </div>
          {isHeadDoctor ? (
            <Button
              onClick={handleAddDoctor}
              size={isMobile ? "sm" : "default"}
              className="w-full sm:w-auto"
              data-testid="button-add-doctor"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('common:buttons.addDoctor')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="w-full sm:w-auto"
              onClick={() => toast({
                title: t('doctors:adminRequired'),
                description: t('doctors:adminRequiredDesc'),
                variant: "destructive"
              })}
              data-testid="button-admin-required"
            >
              <Settings className="w-4 h-4 mr-2" />
              {t('doctors:adminRequired')}
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('doctors:searchPlaceholder')}
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
                {searchQuery ? t('doctors:empty.noResults') : t('doctors:empty.noDoctors')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? t('doctors:empty.noResultsDesc', { query: searchQuery })
                  : t('doctors:empty.noDoctorsDesc')
                }
              </p>
              {!searchQuery && isAdmin && (
                <Button
                  onClick={handleAddDoctor}
                  data-testid="button-add-first-doctor"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('doctors:empty.addFirstDoctor')}
                </Button>
              )}
              {!searchQuery && !isHeadDoctor && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('doctors:empty.contactAdmin')}
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
                    {/* Role Badge */}
                    <div className="flex items-center">
                      <Badge
                        variant={doctor.role === 'head_doctor' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {doctor.role === 'head_doctor' ? t('common:roles.headDoctor') : t('common:roles.doctor')}
                      </Badge>
                    </div>

                    {/* Contact Information */}
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

                    {/* Office Information */}
                    {doctor.cabinetNumber && (
                      <div className="flex items-center text-muted-foreground">
                        <Building2 className="w-4 h-4 mr-2" />
                        <span data-testid={`text-doctor-cabinet-${doctor.id}`}>
                          {t('doctors:card.cabinet', { number: doctor.cabinetNumber })}
                        </span>
                      </div>
                    )}

                    {/* Account Status */}
                    <div className="flex items-center text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full mr-2 ${doctor.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs">
                        {doctor.isActive ? t('doctors:card.active') : t('doctors:card.inactive')}
                      </span>
                    </div>

                    {/* Join Date */}
                    {doctor.createdAt && (
                      <div className="text-xs text-muted-foreground">
                        {t('doctors:card.joined', { date: new Date(doctor.createdAt).toLocaleDateString() })}
                      </div>
                    )}
                  </div>

                  {/* Management Buttons - Only for Head Doctors and Admins */}
                  {isHeadDoctor && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDoctor(doctor)}
                        className="flex-1"
                        data-testid={`button-edit-doctor-${doctor.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('common:buttons.edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="flex-1 text-destructive hover:text-destructive"
                        data-testid={`button-delete-doctor-${doctor.id}`}
                      >
                        {t('common:buttons.delete')}
                      </Button>
                    </div>
                  )}
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
