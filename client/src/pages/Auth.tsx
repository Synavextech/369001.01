import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InternationalPhoneInput } from "@/components/ui/phone-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema, loginSchema, type InsertUser, type LoginCredentials } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ButtonLoader } from "@/components/LoadingSpinner";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();

  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      gender: "geek",
      referredBy: null,
    },
  });

  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: LoginCredentials) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful!",
        description: "Welcome back to ProMo-G",
      });
      setUser(data.user);
      
      // Check approval status first
      if (data.user.approvalStatus === 'pending') {
        setLocation("/waiting-approval");
        return;
      }
      
      // Check orientation status
      const orientationStatus = data.user.orientationStatus as any;
      
      if (!orientationStatus?.overallCompleted) {
        // Orientation incomplete - redirect to orientation page
        setLocation("/orientation");
      } else if (!data.user.subscriptionTier) {
        // Orientation complete but no subscription - redirect to subscription page
        setLocation("/subscription");
      } else {
        // Both orientation and subscription complete - go to dashboard
        setLocation("/home");
      }
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful!",
        description: "Welcome to ProMo-G! Please complete the orientation to get started.",
      });
      setUser(data.user);
      // Redirect new users to orientation page
      setLocation("/orientation");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: InsertUser) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md shadow-xl border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to ProMo-G
          </CardTitle>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <span className="text-accent">Geek</span> 🤓🤓
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && <ButtonLoader />}
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Official Name</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    (as it will appear on verification documents)
                  </p>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    {...registerForm.register("name")}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="register-phone">Phone Number</Label>
                  <InternationalPhoneInput
                    value={registerForm.watch("phone") || ""}
                    onChange={(value) => registerForm.setValue("phone", value || "")}
                    placeholder="Enter phone number"
                    error={!!registerForm.formState.errors.phone}
                  />
                  {registerForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a strong password"
                    {...registerForm.register("password", {
                      onChange: (e) => setPasswordValue(e.target.value)
                    })}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                  <PasswordStrength password={passwordValue} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    {...registerForm.register("confirmPassword", {
                      onChange: (e) => setConfirmPasswordValue(e.target.value)
                    })}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select onValueChange={(value) => registerForm.setValue('gender', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">🙍🏻‍♂️ Male</SelectItem>
                      <SelectItem value="female">🙎‍♀️ Female</SelectItem>
                      <SelectItem value="geek">🤓 Just a Geek</SelectItem>
                    </SelectContent>
                  </Select>
                  {registerForm.formState.errors.gender && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.gender.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={registerMutation.isPending || !registerForm.formState.isValid}
                >
                  {registerMutation.isPending && <ButtonLoader />}
                  {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-accent hover:text-accent/80 hover:bg-accent/10 transition-all duration-200"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
