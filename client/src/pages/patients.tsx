import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientFormModal } from "@/components/patient-form-modal";
import { VisitFormModal } from "@/components/visit-form-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  UserPlus,
  Edit,
  PlusCircle
} from "lucide-react";
import { Patient } from "@shared/schema";

type PatientWithVisitType = Patient & { lastVisitType?: string };

export default function Patients() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation(['patients', 'common']);

  const { data: patients = [], isLoading } = useQuery<PatientWithVisitType[]>({
    queryKey: ["/api/patients", { search: searchQuery || undefined }],
    queryFn: async () => {
      const url = searchQuery
        ? `/api/patients?search=${encodeURIComponent(searchQuery)}`
        : '/api/patients';
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });


  // No need for client-side filtering since API handles search
  const filteredPatients = patients;

  const handleNewVisit = (patientId: number) => {
    setSelectedPatientId(patientId);
    setIsVisitModalOpen(true);
  };

  const handlePatientClick = (patientId: number, event: React.MouseEvent) => {
    // Prevent navigation if clicking on action buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    setLocation(`/patients/${patientId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">{t('patients:title')}</h2>
            <p className="text-muted-foreground mt-2">{t('patients:subtitle')}</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            data-testid="button-add-patient"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('common:buttons.addPatient')}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('patients:searchPlaceholder')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-patients"
            />
          </div>
        </div>

        {/* Patient List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('patients:patientCount', { count: filteredPatients.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">{t('patients:loading')}</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t('patients:empty.noResults') : t('patients:empty.noPatients')}
              </div>
            ) : isMobile ? (
              // Mobile Compact List Layout with Scrolling
              <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-2">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 hover:bg-accent transition-colors border-b border-border cursor-pointer flex-shrink-0"
                    data-testid={`patient-row-${patient.id}`}
                    onClick={(e) => handlePatientClick(patient.id, e)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" data-testid={`patient-name-${patient.id}`}>
                          {patient.name}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`patient-phone-${patient.id}`}>
                          {patient.phone} • Age: {patient.age || 'N/A'} • Last: {patient.lastVisit ? `${new Date(patient.lastVisit).toLocaleDateString()}${patient.lastVisitType ? ` (${patient.lastVisitType})` : ''}` : t('patients:never')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNewVisit(patient.id)}
                        data-testid={`button-new-visit-${patient.id}`}
                      >
                        <PlusCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Desktop Table Layout with Scrolling
              <div className="max-h-[70vh] overflow-auto border rounded-md">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('patients:table.name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('patients:table.phone')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('patients:table.age')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('patients:table.lastVisit')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('patients:table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredPatients.map((patient) => (
                      <tr
                        key={patient.id}
                        className="hover:bg-accent transition-colors cursor-pointer"
                        data-testid={`patient-row-${patient.id}`}
                        onClick={(e) => handlePatientClick(patient.id, e)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground" data-testid={`patient-name-${patient.id}`}>
                            {patient.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground" data-testid={`patient-phone-${patient.id}`}>
                            {patient.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground">
                            {patient.age || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground">
                            {patient.lastVisit ? (
                              <div>
                                <div>{new Date(patient.lastVisit).toLocaleDateString()}</div>
                                {patient.lastVisitType && (
                                  <div className="text-xs text-muted-foreground/70">
                                    {patient.lastVisitType}
                                  </div>
                                )}
                              </div>
                            ) : t('patients:never')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNewVisit(patient.id)}
                            data-testid={`button-new-visit-${patient.id}`}
                          >
                            <PlusCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Form Modal */}
        <PatientFormModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setEditingPatient(null);
            }
          }}
          patient={editingPatient}
        />

        {/* Visit Form Modal */}
        <VisitFormModal
          open={isVisitModalOpen}
          onOpenChange={(open) => {
            setIsVisitModalOpen(open);
            if (!open) {
              setSelectedPatientId(null);
            }
          }}
          preSelectedPatientId={selectedPatientId ?? undefined}
        />
      </div>
    </div>
  );
}
