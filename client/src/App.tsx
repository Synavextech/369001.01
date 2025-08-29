import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PWAInstall } from "@/components/PWAInstall";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import { Orientation } from "@/pages/Orientation";
import { Subscription } from "@/pages/Subscription";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import Home from "@/pages/Home";
import Tasks from "@/pages/Tasks";
import Wallet from "@/pages/Wallet";
import Notifications from "@/pages/Notifications";
import Admin from "@/pages/Admin";
import WaitingApproval from "@/pages/WaitingApproval";
import Layout from "@/components/Layout";

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  // Check user status
  const orientationStatus = user?.orientationStatus as any;
  const needsOrientation = user && orientationStatus && !orientationStatus.overallCompleted;
  const needsSubscription = user && orientationStatus?.overallCompleted && !user.subscriptionTier;
  const isPendingApproval = user && user.approvalStatus === 'pending';
  const hasFullAccess = user && user.subscriptionTier && user.approvalStatus === 'approved';

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      
      {/* Orientation page - for new users */}
      {user && (
        <Route path="/orientation" component={Orientation} />
      )}
      
      {/* Subscription page - accessible when orientation is complete but no subscription */}
      {user && (
        <>
          <Route path="/subscription" component={Subscription} />
          <Route path="/subscription-success" component={SubscriptionSuccess} />
        </>
      )}

      {/* Waiting for approval page */}
      {user && isPendingApproval && (
        <Route path="/waiting-approval" component={WaitingApproval} />
      )}

      {/* During orientation or with full access */}
      {user && (needsOrientation || hasFullAccess) && (
        <>
          <Route path="/home" component={() => <Layout><Home /></Layout>} />
          <Route path="/tasks" component={() => <Layout><Tasks /></Layout>} />
          {hasFullAccess && (
            <>
              <Route path="/wallet" component={() => <Layout><Wallet /></Layout>} />
              <Route path="/notifications" component={() => <Layout><Notifications /></Layout>} />
              {user.role === 'admin' && (
                <Route path="/admin" component={() => <Layout><Admin /></Layout>} />
              )}
            </>
          )}
        </>
      )}

      <Route component={() => <div className="min-h-screen flex items-center justify-center"><h1>404 - Page Not Found</h1></div>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <PWAInstall />
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
