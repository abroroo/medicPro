import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { User, UserRole, Clinic } from "@shared/schema";
import { Users, Plus, Shield, UserCheck, UserX, Building2 } from "lucide-react";

export default function UsersPage() {
  const { user, isAdmin, isHeadDoctor } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateClinicModalOpen, setIsCreateClinicModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | "">();

  // Redirect if not head doctor or admin
  if (!isHeadDoctor) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground text-center">
              Only head doctors and administrators can access user management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch clinics
  const { data: clinics, isLoading: clinicsLoading } = useQuery<Clinic[]>({
    queryKey: ["/api/clinics"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; firstName: string; lastName: string; role: UserRole; clinicId: number; specialization?: string; cabinetNumber?: string; phone?: string }) => {
      const res = await apiRequest("POST", "/api/users", userData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateUserModalOpen(false);
      setSelectedRole("");
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Create clinic mutation
  const createClinicMutation = useMutation({
    mutationFn: async (clinicData: { name: string; contactEmail: string; contactPhone: string; address: string }) => {
      const res = await apiRequest("POST", "/api/clinics", clinicData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinics"] });
      setIsCreateClinicModalOpen(false);
      toast({
        title: "Success",
        description: "Clinic created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create clinic",
        variant: "destructive",
      });
    },
  });


  const handleCreateUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const userData: any = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as UserRole,
      clinicId: parseInt(formData.get("clinicId") as string),
    };

    // Add doctor-specific fields if role is doctor or head_doctor
    const role = formData.get("role") as UserRole;
    if (role === 'doctor' || role === 'head_doctor') {
      userData.specialization = formData.get("specialization") as string;
      userData.cabinetNumber = formData.get("cabinetNumber") as string;
      userData.phone = formData.get("phone") as string;
    }

    createUserMutation.mutate(userData);
  };

  const handleCreateClinic = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    createClinicMutation.mutate({
      name: formData.get("name") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      address: formData.get("address") as string,
    });
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'head_doctor': return 'default';
      case 'doctor': return 'default';
      case 'receptionist': return 'secondary';
      case 'user': return 'outline';
      default: return 'outline';
    }
  };

  if (usersLoading || clinicsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users for {user?.clinic?.name || 'your clinic'}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateClinicModalOpen} onOpenChange={setIsCreateClinicModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Add Clinic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Clinic</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateClinic} className="space-y-4">
                <div>
                  <Label htmlFor="name">Clinic Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" required />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input id="contactPhone" name="contactPhone" required />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" required />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createClinicMutation.isPending}
                >
                  {createClinicMutation.isPending ? "Creating..." : "Create Clinic"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <div>
                  <Label htmlFor="clinicId">Clinic</Label>
                  <Select name="clinicId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics?.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id.toString()}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" required onValueChange={(value) => setSelectedRole(value as UserRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="head_doctor">Head Doctor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Doctor-specific fields */}
                {(selectedRole === 'doctor' || selectedRole === 'head_doctor') && (
                  <>
                    <div>
                      <Label htmlFor="specialization">Specialization *</Label>
                      <Input
                        id="specialization"
                        name="specialization"
                        placeholder="e.g., General Dentistry, Orthodontics"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cabinetNumber">Cabinet Number</Label>
                      <Input
                        id="cabinetNumber"
                        name="cabinetNumber"
                        placeholder="Office/cabinet number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Contact phone number"
                      />
                    </div>
                  </>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="clinics">Clinics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {clinics?.map((clinic) => {
            const clinicUsers = users?.filter(user => user.clinicId === clinic.id) || [];
            return (
              <Card key={clinic.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {clinic.name}
                    <Badge variant="outline">{clinicUsers.length} users</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {clinicUsers.length > 0 ? (
                    clinicUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {user.isActive ? (
                              <UserCheck className="h-6 w-6 text-green-600" />
                            ) : (
                              <UserX className="h-6 w-6 text-red-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">
                              {user.firstName} {user.lastName}
                            </h4>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(user.createdAt).toLocaleDateString()}
                              {user.lastLogin && ` • Last login: ${new Date(user.lastLogin).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                          {!user.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>No users in this clinic</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {!users?.length && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No users found</h2>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by creating a clinic and adding users.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setIsCreateClinicModalOpen(true)} variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    Add First Clinic
                  </Button>
                  <Button onClick={() => setIsCreateUserModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First User
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clinics" className="space-y-4">
          <div className="grid gap-4">
            {clinics?.map((clinic) => {
              const clinicUserCount = users?.filter(user => user.clinicId === clinic.id).length || 0;
              return (
                <Card key={clinic.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{clinic.name}</h3>
                          <p className="text-sm text-muted-foreground">{clinic.contactEmail}</p>
                          <p className="text-sm text-muted-foreground">{clinic.contactPhone}</p>
                          <p className="text-sm text-muted-foreground">{clinic.address}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created: {new Date(clinic.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{clinicUserCount} users</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {!clinics?.length && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No clinics found</h2>
                  <p className="text-muted-foreground text-center mb-4">
                    Get started by creating your first clinic.
                  </p>
                  <Button onClick={() => setIsCreateClinicModalOpen(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Add First Clinic
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}