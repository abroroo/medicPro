import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Stethoscope, Shield, Users, Clock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['auth', 'common']);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleLogin = (data: LoginData) => {
    loginMutation.mutate({ email: data.email, password: data.password });
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">MedicPro</h1>
              </div>
              <h2 className="text-4xl font-bold text-foreground leading-tight">
                {t('auth:hero.tagline')}
              </h2>
              <p className="text-xl text-muted-foreground">
                {t('auth:hero.description')}
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('auth:features.patientManagement.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('auth:features.patientManagement.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('auth:features.digitalQueue.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('auth:features.digitalQueue.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('auth:features.secure.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('auth:features.secure.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                {t('auth:login.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('auth:login.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={t('auth:login.emailPlaceholder')}
                    {...loginForm.register("email")}
                    data-testid="input-login-email"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('auth:login.password')}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder={t('auth:login.passwordPlaceholder')}
                    {...loginForm.register("password")}
                    data-testid="input-login-password"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? t('auth:login.submitting') : t('auth:login.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}