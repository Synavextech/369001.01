import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@shared/schema";

interface UserWithApproval extends User {
  approvalStatus: 'pending' | 'approved' | 'rejected';
}
import { Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function WaitingApproval() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();

  // Poll user status every 5 seconds to check if approved
  const { data: updatedUser } = useQuery<UserWithApproval>({
    queryKey: [`/api/users/${user?.id}`],
    enabled: !!user?.id && user.approvalStatus === 'pending',
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }

    // If user is already approved, redirect to home
    if (user.approvalStatus === 'approved') {
      setLocation("/home");
      return;
    }

    // Update user state if approval status changes and is valid
    if (updatedUser?.approvalStatus && updatedUser.approvalStatus !== 'pending') {
      setUser(updatedUser as UserWithApproval);
      if (updatedUser.approvalStatus === 'approved') {
        setLocation("/home");
      }
    }
  }, [user, updatedUser, setLocation, setUser]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Awaiting Admin Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              Thank you for completing your payment! Your account is currently under review.
            </p>
            <p className="text-sm text-muted-foreground">
              An administrator will approve your account shortly. This usually takes just a few minutes.
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Registration completed</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Payment received</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
              <span className="text-sm">Awaiting admin approval</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              This page will automatically redirect once your account is approved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}