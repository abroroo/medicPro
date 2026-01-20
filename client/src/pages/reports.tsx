import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DateRangePresets } from "@/components/reports/date-range-presets";
import { SortableTable } from "@/components/reports/sortable-table";
import {
  Download,
  Printer,
  Users,
  Calendar,
  CalendarDays,
  CalendarCheck,
  Stethoscope,
  FileText,
  Search,
  TrendingUp
} from "lucide-react";
import { Patient, User } from "@shared/schema";

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
    firstName: string;
    lastName: string;
    name?: string;
    specialization: string;
  };
  clinicalNotes: unknown[];
}

interface PatientStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
}

interface VisitStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
  completed: number;
  scheduled: number;
  cancelled: number;
}

export default function Reports() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("patients");
  const [datePreset, setDatePreset] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [patientSearch, setPatientSearch] = useState("");

  const [visitFilters, setVisitFilters] = useState<VisitFilters>({
    dateFrom: "",
    dateTo: "",
    patientName: "",
    doctorId: "all",
    visitType: "all",
    status: "all",
  });

  const { data: patientStats, isLoading: patientStatsLoading } = useQuery<PatientStats>({
    queryKey: ["/api/reports/stats"],
  });

  const { data: visitStats, isLoading: visitStatsLoading } = useQuery<VisitStats>({
    queryKey: ["/api/reports/visits/stats"],
  });

  const { data: doctors = [] } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "doctor" }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users?role=doctor");
      return res.json();
    },
  });

  const { data: patients = [], isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/reports/patients", dateRange, patientSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);
      if (patientSearch) params.append('patientName', patientSearch);

      const url = `/api/reports/patients${params.toString() ? '?' + params.toString() : ''}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: activeTab === "patients",
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery<VisitWithRelations[]>({
    queryKey: ["/api/reports/visits", { ...visitFilters, ...dateRange, patientName: patientSearch }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);
      if (patientSearch) params.append('patientName', patientSearch);
      if (visitFilters.doctorId && visitFilters.doctorId !== "all") params.append('doctorId', visitFilters.doctorId);
      if (visitFilters.visitType && visitFilters.visitType !== "all") params.append('visitType', visitFilters.visitType);
      if (visitFilters.status && visitFilters.status !== "all") params.append('status', visitFilters.status);

      const url = `/api/reports/visits${params.toString() ? '?' + params.toString() : ''}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: activeTab === "visits",
  });

  const handleDatePresetChange = (from: string, to: string, preset: string) => {
    setDatePreset(preset);
    setDateRange({ from, to });
  };

  const handleVisitFilterChange = (field: keyof VisitFilters, value: string) => {
    setVisitFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (dateRange.from) params.append('dateFrom', dateRange.from);
    if (dateRange.to) params.append('dateTo', dateRange.to);
    if (patientSearch) params.append('patientName', patientSearch);

    if (activeTab === "patients") {
      window.open(`/api/reports/export?${params.toString()}`, '_blank');
    } else {
      if (visitFilters.doctorId && visitFilters.doctorId !== "all") params.append('doctorId', visitFilters.doctorId);
      if (visitFilters.visitType && visitFilters.visitType !== "all") params.append('visitType', visitFilters.visitType);
      if (visitFilters.status && visitFilters.status !== "all") params.append('status', visitFilters.status);
      window.open(`/api/reports/visits/export?${params.toString()}`, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
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

  // Patient table columns
  const patientColumns = useMemo(() => [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (value: unknown) => (
        <span className="font-medium">{String(value)}</span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      sortable: false,
    },
    {
      key: "age",
      label: "Age",
      sortable: true,
      render: (value: unknown) => value ? String(value) : "N/A",
    },
    {
      key: "address",
      label: "Address",
      sortable: false,
      className: "max-w-[200px] truncate",
      render: (value: unknown) => value ? String(value) : "N/A",
    },
    {
      key: "lastVisit",
      label: "Last Visit",
      sortable: true,
      render: (value: unknown) =>
        value ? new Date(value as string).toLocaleDateString() : "Never",
    },
  ], []);

  // Visit table columns
  const visitColumns = useMemo(() => [
    {
      key: "visitDate",
      label: "Date",
      sortable: true,
      render: (value: unknown) => new Date(value as string).toLocaleDateString(),
    },
    {
      key: "patient.name",
      label: "Patient",
      sortable: true,
      render: (_: unknown, row: VisitWithRelations) => (
        <div>
          <div className="font-medium">{row.patient.name}</div>
          <div className="text-xs text-muted-foreground">{row.patient.phone}</div>
        </div>
      ),
    },
    {
      key: "doctor.firstName",
      label: "Doctor",
      sortable: true,
      render: (_: unknown, row: VisitWithRelations) => (
        <div>
          <div>{row.doctor.firstName} {row.doctor.lastName}</div>
          <div className="text-xs text-muted-foreground">{row.doctor.specialization}</div>
        </div>
      ),
    },
    {
      key: "visitType",
      label: "Type",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={getStatusBadgeVariant(value as string)}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "chiefComplaint",
      label: "Chief Complaint",
      sortable: false,
      className: "max-w-[200px] truncate",
      render: (value: unknown) => value ? String(value) : "N/A",
    },
  ], []);

  const currentStats = activeTab === "patients" ? patientStats : visitStats;
  const statsLoading = activeTab === "patients" ? patientStatsLoading : visitStatsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-center'} mb-6 no-print`}>
          <div>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>Reports</h2>
            <p className="text-muted-foreground mt-1">View and export patient and visit data</p>
          </div>
          <div className={`${isMobile ? 'flex gap-2' : 'flex space-x-3'}`}>
            <Button
              onClick={handleExportCSV}
              className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 md:flex-none"
              data-testid="button-print-report"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Stats Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 no-print">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentStats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentStats?.thisMonth || 0}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentStats?.thisWeek || 0}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <CalendarCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentStats?.today || 0}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Range Presets */}
        <div className="mb-6 no-print">
          <DateRangePresets
            selected={datePreset}
            onSelect={handleDatePresetChange}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

          {/* Filters Row */}
          <Card className="no-print">
            <CardContent className="p-4">
              <div className={`flex ${isMobile ? 'flex-col' : 'flex-row items-end'} gap-4`}>
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient name..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-filter-patient-name"
                    />
                  </div>
                </div>

                {/* Visit-specific filters */}
                {activeTab === "visits" && (
                  <>
                    <Select
                      value={visitFilters.doctorId}
                      onValueChange={(value) => handleVisitFilterChange('doctorId', value)}
                    >
                      <SelectTrigger className="w-full md:w-[180px]" data-testid="select-filter-doctor">
                        <SelectValue placeholder="All doctors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All doctors</SelectItem>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            {doctor.firstName} {doctor.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={visitFilters.visitType}
                      onValueChange={(value) => handleVisitFilterChange('visitType', value)}
                    >
                      <SelectTrigger className="w-full md:w-[150px]" data-testid="select-filter-visit-type">
                        <SelectValue placeholder="Visit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Dental">Dental</SelectItem>
                        <SelectItem value="Follow-up">Follow-up</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                        <SelectItem value="Gynecology">Gynecology</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={visitFilters.status}
                      onValueChange={(value) => handleVisitFilterChange('status', value)}
                    >
                      <SelectTrigger className="w-full md:w-[140px]" data-testid="select-filter-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Patient Reports Tab */}
          <TabsContent value="patients">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <FileText className="w-5 h-5 mr-2" />
                  Patient Report
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({patients.length} {patients.length === 1 ? 'patient' : 'patients'})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isMobile ? (
                  // Mobile Card Layout
                  <div className="space-y-3">
                    {patientsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <Card key={i} className="p-4 animate-pulse">
                          <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                          <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </Card>
                      ))
                    ) : patients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No patients found matching the current filters.
                      </div>
                    ) : (
                      patients.map((patient) => (
                        <Card key={patient.id} className="p-4" data-testid={`report-patient-${patient.id}`}>
                          <h3 className="font-semibold text-foreground">{patient.name}</h3>
                          <div className="text-sm text-muted-foreground space-y-1 mt-2">
                            <p>Phone: {patient.phone}</p>
                            <p>Age: {patient.age || 'N/A'}</p>
                            {patient.address && <p>Address: {patient.address}</p>}
                            <p>Last Visit: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Never'}</p>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ) : (
                  <SortableTable
                    columns={patientColumns}
                    data={patients}
                    isLoading={patientsLoading}
                    emptyMessage="No patients found matching the current filters."
                    keyExtractor={(patient) => patient.id}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visit History Tab */}
          <TabsContent value="visits">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  Visit History
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({visits.length} {visits.length === 1 ? 'visit' : 'visits'})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isMobile ? (
                  // Mobile Card Layout
                  <div className="space-y-3">
                    {visitsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <Card key={i} className="p-4 animate-pulse">
                          <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                          <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </Card>
                      ))
                    ) : visits.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No visits found matching the current filters.
                      </div>
                    ) : (
                      visits.map((visit) => (
                        <Card key={visit.id} className="p-4" data-testid={`report-visit-${visit.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{visit.patient.name}</h3>
                            <Badge variant={getStatusBadgeVariant(visit.status)}>
                              {visit.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Date: {new Date(visit.visitDate).toLocaleDateString()}</p>
                            <p>Doctor: {visit.doctor.firstName} {visit.doctor.lastName}</p>
                            <p>Type: {visit.visitType}</p>
                            {visit.chiefComplaint && <p>Complaint: {visit.chiefComplaint}</p>}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ) : (
                  <SortableTable
                    columns={visitColumns}
                    data={visits}
                    isLoading={visitsLoading}
                    emptyMessage="No visits found matching the current filters."
                    keyExtractor={(visit) => visit.id}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
