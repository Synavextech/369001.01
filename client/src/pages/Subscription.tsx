import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Diamond, Shield, Star, Trophy, Zap, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import PayPalCheckoutButton from "@/components/PayPalCheckoutButton";

const subscriptionPlans = [
  {
    id: "member",
    name: "Member",
    badge: "👤",
    price: 5,
    linksPerDay: 2,
    accessLevel: "Main tasks",
    color: "border-purple-500",
    bgColor: "bg-purple-500/10",
    iconColor: "text-purple-500",
    icon: User
  },
  {
    id: "silver",
    name: "Silver",
    badge: "🥈",
    price: 10,
    linksPerDay: 5,
    accessLevel: "Main tasks + Social Media",
    color: "border-gray-400",
    bgColor: "bg-gray-400/10",
    iconColor: "text-gray-400",
    icon: Trophy
  },
  {
    id: "bronze",
    name: "Bronze",
    badge: "🥉",
    price: 25,
    linksPerDay: 10,
    accessLevel: "Main tasks + Social Media",
    color: "border-orange-500",
    bgColor: "bg-orange-500/10",
    iconColor: "text-orange-500",
    icon: Star
  },
  {
    id: "diamond",
    name: "Diamond",
    badge: "💎",
    price: 50,
    linksPerDay: 15,
    accessLevel: "Main tasks + Social Media + Survey & Polls",
    color: "border-blue-400",
    bgColor: "bg-blue-400/10",
    iconColor: "text-blue-400",
    icon: Diamond
  },
  {
    id: "gold",
    name: "Gold",
    badge: "🏅",
    price: 75,
    linksPerDay: 20,
    accessLevel: "Main tasks + Social Media + Survey & Polls + App/Website testing",
    color: "border-yellow-500",
    bgColor: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    icon: Crown
  },
  {
    id: "vip",
    name: "VIP",
    badge: "💰",
    price: 100,
    linksPerDay: 25,
    accessLevel: "Main tasks + Social Media + Survey & Polls + App/Website testing + AI training",
    color: "border-purple-600",
    bgColor: "bg-purple-600/10",
    iconColor: "text-purple-600",
    icon: Zap
  }
];

export function Subscription() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState("");

  const selectedPlanData = subscriptionPlans.find(p => p.id === selectedPlan);
  const amount = selectedPlanData ? selectedPlanData.price : 0;

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="container max-w-7xl mx-auto">
        {/* Welcome Note */}
        <div className="text-center mb-6 pt-8">
          <h1 className="text-2xl text-white mb-6">
            Welcome to ProMo-G platform Training subscription page, {user?.name || 'User'}
          </h1>
          
          <p className="text-base text-gray-300 leading-relaxed max-w-4xl mx-auto mb-8">
            Features beyond here are governed by subscription. At the core of what we do is a commitment to meaningful digital engagement, whether through AI training, app and
            website testing, surveys, polls, or social media interaction. These tasks require specific skill sets, aligned with the
            evolving needs of our clients and the latest technology trends. Training is designed to equip you with the right tools to
            thrive. Your participation helps uphold the standards that we assured our clients!!. We are excited to grow with you
          </p>
        </div>

        {/* Subscription Plans - Card Layout for Mobile */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Choose Your Subscription Tier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedPlan === plan.id 
                      ? "border-accent ring-2 ring-accent" 
                      : "border-gray-700"
                  } bg-gray-900`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-6 h-6 ${plan.iconColor}`} />
                        <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
                      </div>
                      <span className="text-2xl">{plan.badge}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-3xl font-bold text-white">${plan.price}<span className="text-lg text-gray-400">/month</span></div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Shield className="w-4 h-4" />
                        <span>{plan.linksPerDay} links/day</span>
                      </div>
                      <div className="text-sm text-gray-400">{plan.accessLevel}</div>
                      <Button
                        variant={selectedPlan === plan.id ? "default" : "outline"}
                        className={`w-full ${
                          selectedPlan === plan.id
                            ? "bg-teal-600 hover:bg-teal-700 text-white"
                            : "border-gray-600 text-gray-300 hover:bg-gray-800"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan.id);
                        }}
                      >
                        {selectedPlan === plan.id ? (
                          <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Selected
                          </span>
                        ) : (
                          "Select Plan"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

       
        {/* PayPal Checkout Button */}
    
        {selectedPlan && (
  <div className="mt-8 flex justify-center">
    <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md"> {/* Changed to bg-white for gold contrast */}
      <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center"> {/* Text to dark for visibility */}
        Complete Your Subscription
      </h3>
      <div className="min-h-[100px] flex items-center justify-center">
        <PayPalCheckoutButton
          tier={selectedPlan}
          amount={amount.toString()}
          currency="USD"
          intent="subscription"
        />
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
}