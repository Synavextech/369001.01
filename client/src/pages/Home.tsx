import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface Wallet {
  totalEarnings: string;
}

interface Notification {
  isRead: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: wallet } = useQuery<Wallet>({
    queryKey: [`/api/users/${user?.id}/wallet`],
    enabled: !!user?.id,
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: [`/api/users/${user?.id}/notifications`],
    enabled: !!user?.id,
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;
  
  // Check if user needs to complete orientation
  const orientationStatus = user?.orientationStatus as any;
  const needsOrientation = orientationStatus && !orientationStatus.overallCompleted;
  
  // If orientation is complete but no subscription, redirect to subscription
  if (user && orientationStatus?.overallCompleted && !user.subscriptionTier) {
    setLocation("/subscription?persistent=true");
    return null;
  }

  const genderEmoji = {
    male: "🙍🏻‍♂️",
    female: "🙎‍♀️",
    geek: "🤓",
  };

  const tierEmoji = {
    member: "👤",
    silver: "🥈",
    bronze: "🥉",
    diamond: "💎",
    gold: "🏅",
    vip: "💰",
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user?.name?.split(" ")[0] || "User"}!
          </h1>
          <p className="text-lg text-accent font-semibold mb-2">
            From free swipe to salary 🤩🤩
          </p>
          <p className="text-muted-foreground">
            Make every scroll count!!! 😎 Click.🤳🏼 Share.📲 Cash Out.🪙
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Turn your scroll 🤳🏼, into income by blending digital hustle with
            networking power and start earning from your influence today
          </p>
        </div>

        {/* Orientation Section for new users */}
        {needsOrientation && (
          <Card className="mb-8 border-accent bg-accent/5">
            <CardHeader>
              <CardTitle className="text-accent">Welcome to ProMo-G! Complete Your Orientation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Complete 2 tasks in each category to unlock full access to ProMo-G. This helps you understand how our platform works!
              </p>
              
              <div className="grid gap-3">
                {['main', 'social', 'surveys', 'testing', 'ai'].map((category) => {
                  const categoryStatus = orientationStatus[category];
                  const completedCount = categoryStatus?.completedTasks?.length || 0;
                  const isCompleted = categoryStatus?.isCompleted || false;
                  
                  return (
                    <div key={category} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {category === 'main' && '📝'}
                          {category === 'social' && '📱'}
                          {category === 'surveys' && '📊'}
                          {category === 'testing' && '🧪'}
                          {category === 'ai' && '🤖'}
                        </span>
                        <span className="font-medium capitalize">{category} Tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isCompleted ? 'text-success' : 'text-muted-foreground'}`}>
                          {completedCount}/2 completed
                        </span>
                        {isCompleted && <span className="text-success">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Button 
                onClick={() => setLocation("/tasks")}
                className="w-full bg-accent hover:bg-accent/90"
              >
                Start Orientation Tasks
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => setLocation('/tasks')}
            className="h-auto p-4 flex flex-col gap-2 bg-accent hover:bg-accent/90"
          >
            <span className="text-2xl">📝</span>
            <span className="text-sm font-medium">Browse Tasks</span>
          </Button>
          
          <Button 
            onClick={() => setLocation('/wallet')}
            className="h-auto p-4 flex flex-col gap-2 bg-success hover:bg-success/90"
            disabled={!user?.subscriptionTier}
          >
            <span className="text-2xl">💳</span>
            <span className="text-sm font-medium">My Wallet</span>
          </Button>
          
          <Button 
            onClick={() => setLocation('/notifications')}
            className="h-auto p-4 flex flex-col gap-2 bg-warning hover:bg-warning/90 relative"
            disabled={!user?.subscriptionTier}
          >
            <span className="text-2xl">🔔</span>
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </Button>
          
          <Button 
            onClick={() => setLocation('/subscription')}
            className="h-auto p-4 flex flex-col gap-2 bg-gradient-to-br from-purple-600 to-pink-600 hover:opacity-90"
            disabled={!!user?.subscriptionTier}
          >
            <span className="text-2xl">👑</span>
            <span className="text-sm font-medium">Upgrade</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-success">
                ${parseFloat(wallet?.totalEarnings || "0").toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Total Earnings 🪙
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-accent">0</div>
              <div className="text-xs text-muted-foreground">Tasks Done</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-warning">0</div>
              <div className="text-xs text-muted-foreground">Referrals</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">
                {user?.subscriptionTier
                  ? tierEmoji[user.subscriptionTier as keyof typeof tierEmoji]
                  : "🔒"}
              </div>
              <div className="text-xs text-muted-foreground">Level</div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Chart Placeholder */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">
                Earnings Chart Coming Soon
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="mb-8 border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="text-warning">Please Note:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              The tasks we offer - such as AI training, app/website testing, and
              feature evaluations; require strong attention to detail. To ensure
              quality and match the right contributors with the right
              opportunities, we may request additional professional
              documentation to verify your qualifications.
            </p>
            <p>
              All activity is monitored to maintain performance standards and
              determine compensation. Only fully completed tasks will be
              eligible for payment.
            </p>
            <p>
              We encourage you to focus on delivering high-quality work to
              maximize your earnings. Thank you, and happy tasking!
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => setLocation("/tasks")}
            className="bg-accent hover:bg-accent/90 p-6 h-auto flex flex-col items-center gap-2"
          >
            <div className="text-2xl">📝</div>
            <span className="font-semibold">Start Tasks 👨🏽‍💻</span>
          </Button>

          <Button
            onClick={() => setLocation("/wallet")}
            className="bg-success hover:bg-success/90 p-6 h-auto flex flex-col items-center gap-2"
          >
            <div className="text-2xl">💳</div>
            <span className="font-semibold">View Wallet 👀</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
