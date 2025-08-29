import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Lock, ExternalLink, Clock, Coins, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Task } from "@shared/schema";

const categoryInfo = {
  main: { title: "Main Tasks", description: "Essential platform tasks" },
  social: { title: "Social Media", description: "Social engagement tasks" },
  surveys: { title: "Surveys & Polls", description: "Market research tasks" },
  testing: { title: "App Testing", description: "Test apps and websites" },
  ai: { title: "AI Training", description: "Help train AI models" }
};

export function Orientation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [viewedTasks, setViewedTasks] = useState<Set<number>>(new Set());
  const [hasReviewed, setHasReviewed] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch orientation tasks
  const { data: tasks = [], isLoading, error, refetch } = useQuery<Task[]>({
    queryKey: ['/api/tasks/orientation'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    retry: 3,
    retryDelay: 1000,
  });

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Calculate if all tasks have been viewed
  const allTasksViewed = tasks.length > 0 && viewedTasks.size === tasks.length;
  const canProceed = allTasksViewed && hasReviewed;

  const handleTaskView = (task: Task) => {
    setSelectedTask(task);
    setViewedTasks(prev => new Set(Array.from(prev).concat(task.id)));
  };

  const handleProceedToSubscription = () => {
    if (canProceed) {
      toast({
        title: "Orientation Complete!",
        description: "Welcome to ProMo-G! Let's get you subscribed.",
      });
      setLocation("/subscription");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orientation tasks...</p>
        </div>
      </div>
    );
  }

  if (error || tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Unable to Load Orientation Tasks</CardTitle>
            <CardDescription>
              Tasks can't be accessed from the database at the moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Keep refreshing - tasks will be available soon!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Auto-refreshing every 5 seconds...
              </p>
            </div>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background p-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-2">Welcome to ProMo-G Orientation</h1>
          <p className="text-muted-foreground">
            Please complete your orientation process to proceed.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Note: This is a temporary review process that does not save data to the database.
          </p>
          <div className="mt-4">
            <Progress 
              value={(viewedTasks.size / Math.max(tasks.length, 1)) * 100} 
              className="h-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {viewedTasks.size} of {tasks.length} tasks viewed
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl p-6">
        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="space-y-6">
            {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xl font-semibold">
                    {categoryInfo[category as keyof typeof categoryInfo]?.title}
                  </h2>
                  <Badge variant="outline">
                    {categoryTasks.filter(t => viewedTasks.has(t.id)).length}/{categoryTasks.length} viewed
                  </Badge>
                </div>
                
                <div className="grid gap-3">
                  {categoryTasks.map(task => (
                    <Card 
                      key={task.id}
                      className={`cursor-pointer transition-all ${
                        viewedTasks.has(task.id) ? 'opacity-75' : 'hover:shadow-md'
                      } ${selectedTask?.id === task.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => handleTaskView(task)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{task.title}</h3>
                              {viewedTasks.has(task.id) && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Coins className="h-3 w-3" />
                                <span>${task.reward}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{Math.floor(task.minDuration / 60)} min</span>
                              </div>
                              {task.url && (
                                <div className="flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  <span>External Link</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bottom Section */}
        <div className="mt-6 space-y-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="reviewed"
                  checked={hasReviewed}
                  onCheckedChange={(checked) => setHasReviewed(!!checked)}
                  disabled={!allTasksViewed}
                />
                <div className="space-y-1">
                  <label 
                    htmlFor="reviewed" 
                    className={`text-sm font-medium leading-none ${
                      !allTasksViewed ? 'text-muted-foreground' : 'cursor-pointer'
                    }`}
                  >
                    I have reviewed all the orientation tasks
                  </label>
                  {!allTasksViewed && (
                    <p className="text-xs text-muted-foreground">
                      Please view all tasks above before checking this box
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleProceedToSubscription}
            disabled={!canProceed}
            className="w-full"
            size="lg"
          >
            {!allTasksViewed ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                View All Tasks First
              </>
            ) : !hasReviewed ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Check the Box Above
              </>
            ) : (
              "Proceed to Subscription"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}