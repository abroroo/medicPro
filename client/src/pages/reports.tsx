import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Printer, 
  Filter,
  Users, 
  Calendar, 
  CalendarDays, 
  CalendarCheck,
  RotateCcw,
  Stethoscope,
  FileText
} from "lucide-react";
import { Patient, Doctor } from "@shared/schema";

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  patientName: string;
}

interface VisitFilters {
  dateFrom: string;
  dateTo: string;
  patientName: string;
  doctorId: string;
  visitType: string;
  status: string;
}

interface VisitWithRelations {
  id: number;
  visitDate: string;
  visitType: string;
  status: string;
  chiefComplaint: string | null;
  patient: {
    id: number;
    name: string;
    phone: string;
  };
  doctor: {
    id: number;
    name: string;
    specialization: string;
  };
  clinicalNotes: any[];
}

export default function Reports() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("patients");
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    patientName: "",
  });
  
  const [visitFilters, setVisitFilters] = useState<VisitFilters>({
    dateFrom: "",
    dateTo: "",
    patientName: "",
    doctorId: "all",
    visitType: "all",
    status: "all",
  });

  const { data: patientStats } = useQuery({
    queryKey: ["/api/reports/stats"],
  });

  const { data: visitStats } = useQuery({
    queryKey: ["/api/reports/visits/stats"],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/reports/patients", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.patientName) params.append('patientName', filters.patientName);
      
      const url = `/api/reports/patients${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: activeTab === "patients",
  });

  const { data: visits = [] } = useQuery<VisitWithRelations[]>({
    queryKey: ["/api/reports/visits", visitFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (visitFilters.dateFrom) params.append('dateFrom', visitFilters.dateFrom);
      if (visitFilters.dateTo) params.append('dateTo', visitFilters.dateTo);
      if (visitFilters.patientName) params.append('patientName', visitFilters.patientName);
      if (visitFilters.doctorId && visitFilters.doctorId !== "all") params.append('doctorId', visitFilters.doctorId);
      if (visitFilters.visitType && visitFilters.visitType !== "all") params.append('visitType', visitFilters.visitType);
      if (visitFilters.status && visitFilters.status !== "all") params.append('status', visitFilters.status);
      
      const url = `/api/reports/visits${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: activeTab === "visits",
  });

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVisitFilterChange = (field: keyof VisitFilters, value: string) => {
    setVisitFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetFilters = () => {
    if (activeTab === "patients") {
      setFilters({
        dateFrom: "",
        dateTo: "",
        patientName: "",
      });
    } else {
      setVisitFilters({
        dateFrom: "",
        dateTo: "",
        patientName: "",
        doctorId: "all",
        visitType: "all",
        status: "all",
      });
    }
  };

  const handleExportCSV = () => {
    if (activeTab === "patients") {
      // Export patient data
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.patientName) params.append('patientName', filters.patientName);
      window.open(`/api/reports/export?${params.toString()}`, '_blank');
    } else {
      // Export visit data
      const params = new URLSearchParams();
      if (visitFilters.dateFrom) params.append('dateFrom', visitFilters.dateFrom);
      if (visitFilters.dateTo) params.append('dateTo', visitFilters.dateTo);
      if (visitFilters.patientName) params.append('patientName', visitFilters.patientName);
      if (visitFilters.doctorId && visitFilters.doctorId !== "all") params.append('doctorId', visitFilters.doctorId);
      if (visitFilters.visitType && visitFilters.visitType !== "all") params.append('visitType', visitFilters.visitType);
      if (visitFilters.status && visitFilters.status !== "all") params.append('status', visitFilters.status);
      window.open(`/api/reports/visits/export?${params.toString()}`, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'Scheduled':
        return 'secondary';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-center'} mb-6 no-print`}>
          <div>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>Reports & Analytics</h2>
            <p className="text-muted-foreground mt-2">View patient data and export reports</p>
          </div>
          <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'flex space-x-3'}`}>
            <Button 
              onClick={handleExportCSV}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={handlePrint}
              variant="secondary"
              data-testid="button-print-report"
            >
              <Printer className="w-4 h-4 mr-2" />
              Printer Report
            </Button>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <div className="no-print">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="patients" className="flex items-center gap-2" data-testid="tab-patient-reports">
                <Users className="w-4 h-4" />
                Patient Reports
              </TabsTrigger>
              <TabsTrigger value="visits" className="flex items-center gap-2" data-testid="tab-visit-history">
                <Stethoscope className="w-4 h-4" />
                Visit History
              </TabsTrigger>
            </TabsList>
          </div>

          <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-12 gap-6'}`}>
            {/* Tab-aware Filters */}
            <Card className={`${isMobile ? '' : 'col-span-4'} no-print`}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Common Filters */}
                  <div>
                    <Label htmlFor="dateFrom">Date From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={activeTab === "patients" ? filters.dateFrom : visitFilters.dateFrom}
                      onChange={(e) => activeTab === "patients" 
                        ? handleFilterChange('dateFrom', e.target.value)
                        : handleVisitFilterChange('dateFrom', e.target.value)
                      }
                      data-testid="input-filter-date-from"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Date To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={activeTab === "patients" ? filters.dateTo : visitFilters.dateTo}
                      onChange={(e) => activeTab === "patients" 
                        ? handleFilterChange('dateTo', e.target.value)
                        : handleVisitFilterChange('dateTo', e.target.value)
                      }
                      data-testid="input-filter-date-to"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patientName">Patient Name</Label>
                    <Input
                      id="patientName"
                      placeholder="Search patient..."
                      value={activeTab === "patients" ? filters.patientName : visitFilters.patientName}
                      onChange={(e) => activeTab === "patients" 
                        ? handleFilterChange('patientName', e.target.value)
                        : handleVisitFilterChange('patientName', e.target.value)
                      }
                      data-testid="input-filter-patient-name"
                    />
                  </div>

                  {/* Visit-specific Filters */}
                  {activeTab === "visits" && (
                    <>
                      <div>
                        <Label htmlFor="doctorSelect">Doctor</Label>
                        <Select
                          value={visitFilters.doctorId}
                          onValueChange={(value) => handleVisitFilterChange('doctorId', value)}
                        >
                          <SelectTrigger data-testid="select-filter-doctor">
                            <SelectValue placeholder="All doctors" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All doctors</SelectItem>
                            {doctors.map((doctor) => (
                              <SelectItem key={doctor.id} value={doctor.id.toString()}>
                                {doctor.name} - {doctor.specialization}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="visitTypeSelect">Visit Type</Label>
                        <Select
                          value={visitFilters.visitType}
                          onValueChange={(value) => handleVisitFilterChange('visitType', value)}
                        >
                          <SelectTrigger data-testid="select-filter-visit-type">
                            <SelectValue placeholder="All visit types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All visit types</SelectItem>
                            <SelectItem value="Consultation">Consultation</SelectItem>
                            <SelectItem value="Cleaning">Cleaning</SelectItem>
                            <SelectItem value="Treatment">Treatment</SelectItem>
                            <SelectItem value="Follow-up">Follow-up</SelectItem>
                            <SelectItem value="Emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="statusSelect">Status</Label>
                        <Select
                          value={visitFilters.status}
                          onValueChange={(value) => handleVisitFilterChange('status', value)}
                        >
                          <SelectTrigger data-testid="select-filter-status">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={handleResetFilters}
                    data-testid="button-reset-filters"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                  
                  {/* Desktop Tab-aware Stats */}
                  {!isMobile && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="font-medium text-foreground mb-4 flex items-center">
                        {activeTab === "patients" ? (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Patient Statistics
                          </>
                        ) : (
                          <>
                            <Stethoscope className="w-4 h-4 mr-2" />
                            Visit Statistics
                          </>
                        )}
                      </h4>
                      <div className="space-y-3">
                        {activeTab === "patients" ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Total</span>
                              <span className="font-medium" data-testid="stat-total-patients">{(patientStats as any)?.total || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">This Month</span>
                              <span className="font-medium" data-testid="stat-this-month">{(patientStats as any)?.thisMonth || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">This Week</span>
                              <span className="font-medium" data-testid="stat-this-week">{(patientStats as any)?.thisWeek || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Today</span>
                              <span className="font-medium" data-testid="stat-today">{(patientStats as any)?.today || 0}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Total</span>
                              <span className="font-medium" data-testid="stat-total-visits">{(visitStats as any)?.total || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">This Month</span>
                              <span className="font-medium" data-testid="stat-visits-this-month">{(visitStats as any)?.thisMonth || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">This Week</span>
                              <span className="font-medium" data-testid="stat-visits-this-week">{(visitStats as any)?.thisWeek || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Today</span>
                              <span className="font-medium" data-testid="stat-visits-today">{(visitStats as any)?.today || 0}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mobile Tab-aware Summary Statistics */}
            {isMobile && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    {activeTab === "patients" ? (
                      <>
                        <Users className="w-5 h-5 mr-2" />
                        Patient Statistics
                      </>
                    ) : (
                      <>
                        <Stethoscope className="w-5 h-5 mr-2" />
                        Visit Statistics
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {activeTab === "patients" ? (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-total-patients">
                            {(patientStats as any)?.total || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Patients</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-this-month">
                            {(patientStats as any)?.thisMonth || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">This Month</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-this-week">
                            {(patientStats as any)?.thisWeek || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">This Week</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-today">
                            {(patientStats as any)?.today || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Today</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-total-visits">
                            {(visitStats as any)?.total || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Visits</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-visits-this-month">
                            {(visitStats as any)?.thisMonth || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">This Month</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-visits-this-week">
                            {(visitStats as any)?.thisWeek || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">This Week</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground" data-testid="stat-visits-today">
                            {(visitStats as any)?.today || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Today</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab Content */}
            <div className={`${isMobile ? '' : 'col-span-8'}`}>
              <TabsContent value="patients">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Patient Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {patients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No patients found matching the current filters.
                      </div>
                    ) : isMobile ? (
                      // Mobile Card Layout
                      <div className="space-y-3">
                        {patients.map((patient) => (
                          <Card key={patient.id} className="p-4" data-testid={`report-patient-${patient.id}`}>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-foreground">{patient.name}</h3>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><span className="font-medium">Phone:</span> {patient.phone}</p>
                                <p><span className="font-medium">Age:</span> {patient.age || 'N/A'}</p>
                                {patient.address && (
                                  <p><span className="font-medium">Address:</span> {patient.address}</p>
                                )}
                                <p><span className="font-medium">Last Visit:</span> {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Never'}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      // Desktop Table Layout
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Phone
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Age
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Address
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Last Visit
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {patients.map((patient) => (
                              <tr key={patient.id} className="hover:bg-accent transition-colors" data-testid={`report-patient-${patient.id}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-foreground">
                                    {patient.name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-muted-foreground">
                                    {patient.phone}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-muted-foreground">
                                    {patient.age || 'N/A'}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-muted-foreground">
                                    {patient.address || 'N/A'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-muted-foreground">
                                    {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Never'}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="visits">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Visit History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {visits.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No visits found matching the current filters.
                      </div>
                    ) : isMobile ? (
                      // Mobile Card Layout
                      <div className="space-y-3">
                        {visits.map((visit) => (
                          <Card key={visit.id} className="p-4" data-testid={`report-visit-${visit.id}`}>
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-foreground">{visit.patient.name}</h3>
                                <Badge variant={getStatusBadgeVariant(visit.status)} data-testid={`badge-status-${visit.status.toLowerCase()}`}>
                                  {visit.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><span className="font-medium">Date:</span> {new Date(visit.visitDate).toLocaleDateString()}</p>
                                <p><span className="font-medium">Doctor:</span> {visit.doctor.name} ({visit.doctor.specialization})</p>
                                <p><span className="font-medium">Type:</span> {visit.visitType}</p>
                                <p><span className="font-medium">Phone:</span> {visit.patient.phone}</p>
                                {visit.chiefComplaint && (
                                  <p><span className="font-medium">Chief Complaint:</span> {visit.chiefComplaint}</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      // Desktop Table Layout
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Patient
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Doctor
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Chief Complaint
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {visits.map((visit) => (
                              <tr key={visit.id} className="hover:bg-accent transition-colors" data-testid={`report-visit-${visit.id}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-foreground">
                                    {new Date(visit.visitDate).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-foreground">
                                    {visit.patient.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {visit.patient.phone}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-foreground">
                                    {visit.doctor.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {visit.doctor.specialization}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-muted-foreground">
                                    {visit.visitType}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={getStatusBadgeVariant(visit.status)} data-testid={`badge-status-${visit.status.toLowerCase()}`}>
                                    {visit.status}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-muted-foreground">
                                    {visit.chiefComplaint || 'N/A'}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
