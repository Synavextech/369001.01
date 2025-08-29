import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Home, ClipboardList, Wallet, Bell, User, Settings, Moon, Sun, Menu, LogOut, Crown, HelpCircle, Shield, FileText, Info, UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState("home");

  const { data: notifications } = useQuery<any[]>({
    queryKey: [`/api/users/${user?.id}/notifications`],
    enabled: !!user?.id,
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('tasks')) setCurrentPage('tasks');
    else if (path.includes('wallet')) setCurrentPage('wallet');
    else if (path.includes('notifications')) setCurrentPage('notifications');
    else setCurrentPage('home');
  }, []);

  const navigateTo = (page: string, path: string) => {
    setCurrentPage(page);
    setLocation(path);
  };

  const genderEmoji = {
    male: '🙍🏻‍♂️',
    female: '🙎‍♀️',
    geek: '🤓',
  };

  const tierEmoji = {
    member: '👤',
    silver: '🥈',
    bronze: '🥉',
    diamond: '💎',
    gold: '🏅',
    vip: '💰',
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/254769612473', '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 nav-bg navbar-shadow">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
                <span className="text-2xl">
                  {user?.gender ? genderEmoji[user.gender as keyof typeof genderEmoji] : '🤓'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <div className="flex items-center space-x-3 p-4 border-b">
                <Avatar>
                  <AvatarFallback className="text-2xl">
                    {user?.gender ? genderEmoji[user.gender as keyof typeof genderEmoji] : '🤓'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="p-4 space-y-2 text-sm border-b">
                <p><strong>Phone:</strong> {user?.phone}</p>
                <p className="flex items-center gap-2">
                  <strong>Subscription:</strong> 
                  {user?.subscriptionTier ? (
                    <Badge className="gap-1">
                      {tierEmoji[user.subscriptionTier as keyof typeof tierEmoji]}
                      {user.subscriptionTier}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No subscription</Badge>
                  )}
                </p>
              </div>
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            onClick={toggleTheme}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation("/subscription")}>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Level
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openWhatsApp}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Shield className="mr-2 h-4 w-4" />
                Privacy Policy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                User Agreement
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                FAQ
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Info className="mr-2 h-4 w-4" />
                About
              </DropdownMenuItem>
              {user?.role === 'admin' && (
                <DropdownMenuItem onClick={() => setLocation("/admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive">
                <UserX className="mr-2 h-4 w-4" />
                Deactivate Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-20 min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 nav-bg navbar-shadow sticky-bottom">
        <div className="flex items-center justify-around py-3">
          <Button
            variant="ghost"
            onClick={() => navigateTo('home', '/home')}
            className={`flex flex-col items-center text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all ${
              currentPage === 'home' ? 'nav-item active' : ''
            }`}
          >
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs">Home</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigateTo('tasks', '/tasks')}
            className={`flex flex-col items-center text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all ${
              currentPage === 'tasks' ? 'nav-item active' : ''
            }`}
          >
            <ClipboardList className="h-5 w-5 mb-1" />
            <span className="text-xs">Tasks</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigateTo('wallet', '/wallet')}
            className={`flex flex-col items-center text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all ${
              currentPage === 'wallet' ? 'nav-item active' : ''
            }`}
          >
            <Wallet className="h-5 w-5 mb-1" />
            <span className="text-xs">Wallet</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigateTo('notifications', '/notifications')}
            className={`flex flex-col items-center text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all relative ${
              currentPage === 'notifications' ? 'nav-item active' : ''
            }`}
          >
            <Bell className="h-5 w-5 mb-1" />
            <span className="text-xs">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </nav>
    </div>
  );
}
