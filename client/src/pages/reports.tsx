import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  Printer, 
  Filter,
  Users, 
  Calendar, 
  CalendarDays, 
  CalendarCheck,
  RotateCcw
} from "lucide-react";
import { Patient } from "@shared/schema";

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  patientName: string;
}

export default function Reports() {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    patientName: "",
  });

  const { data: patientStats } = useQuery({
    queryKey: ["/api/reports/stats"],
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
  });

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      patientName: "",
    });
  };

  const handleExportCSV = () => {
    // Create CSV export URL with current filters
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.patientName) params.append('patientName', filters.patientName);
    
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
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

        {/* Main Content Layout */}
        <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-12 gap-6'}`}>
          {/* Filters */}
          <Card className={`${isMobile ? '' : 'col-span-4'} no-print`}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    data-testid="input-filter-date-from"
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    data-testid="input-filter-date-to"
                  />
                </div>
                <div>
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input
                    id="patientName"
                    placeholder="Search patient..."
                    value={filters.patientName}
                    onChange={(e) => handleFilterChange('patientName', e.target.value)}
                    data-testid="input-filter-patient-name"
                  />
                </div>
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
                
                {/* Desktop Stats in Sidebar */}
                {!isMobile && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-medium text-foreground mb-4 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Statistics
                    </h4>
                    <div className="space-y-3">
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
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compact Summary Statistics */}
          {isMobile && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Users className="w-5 h-5 mr-2" />
                  Patient Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Patient Report */}
          <Card className={`${isMobile ? '' : 'col-span-8'}`}>
            <CardHeader>
              <CardTitle>Patient Report</CardTitle>
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
                        {patient.emergencyContact && (
                          <p><span className="font-medium">Emergency:</span> {patient.emergencyContact}</p>
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
                        Emergency Contact
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
                            {patient.emergencyContact || 'N/A'}
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
        </div>
      </div>
    </div>
  );
}
