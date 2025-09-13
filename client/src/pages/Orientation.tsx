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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import { ComponentLoader } from "@/components/LoadingSpinner";
import { withOfflineSupport } from "@/lib/offlineStorage";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasReviewed, setHasReviewed] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch orientation tasks with offline support
  const { data: tasks = [], isLoading, error, refetch } = useQuery<Task[]>({
    queryKey: ['/api/tasks/orientation'],
    queryFn: () => withOfflineSupport(
      async () => {
        const response = await fetch('/api/tasks/orientation');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const data = await response.json();
        return data.success ? data.data : data;
      },
      [], // fallback to empty array
      'orientation-tasks' // cache key
    ),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to complete orientation tasks
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, category }: { taskId: number; category: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const response = await fetch('/api/orientation/complete-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          taskId,
          category,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to complete task');
      return response.json();
    },
    onSuccess: (data) => {
      // Update user data in auth context with new orientation status
      if (user && data.orientationStatus) {
        const updatedUser = { ...user, orientationStatus: data.orientationStatus };
        queryClient.setQueryData(['user', user.id], updatedUser);
      }
      toast({
        title: "Task Completed!",
        description: "Your progress has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Get user's orientation status
  const orientationStatus = user?.orientationStatus as any || {
    main: { completedTasks: [], isCompleted: false },
    social: { completedTasks: [], isCompleted: false },
    surveys: { completedTasks: [], isCompleted: false },
    testing: { completedTasks: [], isCompleted: false },
    ai: { completedTasks: [], isCompleted: false },
    overallCompleted: false
  };

  // Calculate completion status
  const getCompletedTasksForCategory = (category: string) => {
    return orientationStatus[category]?.completedTasks || [];
  };

  const getCategoryCompletionCount = (category: string) => {
    return getCompletedTasksForCategory(category).length;
  };

  const isCategoryCompleted = (category: string) => {
    return getCategoryCompletionCount(category) >= 2;
  };

  const isTaskCompleted = (taskId: number, category: string) => {
    return getCompletedTasksForCategory(category).includes(taskId);
  };

  // Check if all categories have at least 2 completed tasks
  const allCategoriesCompleted = Object.keys(categoryInfo).every(category =>
    isCategoryCompleted(category)
  );
  
  const canProceed = allCategoriesCompleted && hasReviewed;

  const handleTaskComplete = async (task: Task) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete tasks.",
        variant: "destructive",
      });
      return;
    }

    // Check if task is already completed
    if (isTaskCompleted(task.id, task.category)) {
      setSelectedTask(task);
      return;
    }

    // Check if category already has 2 completed tasks
    if (getCategoryCompletionCount(task.category) >= 2) {
      toast({
        title: "Category Complete",
        description: `You've already completed 2 tasks in the ${categoryInfo[task.category as keyof typeof categoryInfo]?.title} category.`,
      });
      setSelectedTask(task);
      return;
    }

    setSelectedTask(task);
    completeTaskMutation.mutate({ taskId: task.id, category: task.category });
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
    return <ComponentLoader text="Loading orientation tasks..." />;
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
              value={(Object.keys(categoryInfo).filter(cat => isCategoryCompleted(cat)).length / Object.keys(categoryInfo).length) * 100}
              className="h-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {Object.keys(categoryInfo).filter(cat => isCategoryCompleted(cat)).length} of {Object.keys(categoryInfo).length} categories completed
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
                  <Badge variant={isCategoryCompleted(category) ? "default" : "outline"}>
                    {getCategoryCompletionCount(category)}/2 completed
                  </Badge>
                </div>
                
                <div className="grid gap-3">
                  {categoryTasks.map(task => (
                    <Card
                      key={task.id}
                      className={`cursor-pointer transition-all ${
                        isTaskCompleted(task.id, task.category) ? 'opacity-75 bg-green-50 dark:bg-green-950' : 'hover:shadow-md'
                      } ${selectedTask?.id === task.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => handleTaskComplete(task)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{task.title}</h3>
                              {isTaskCompleted(task.id, task.category) && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              {getCategoryCompletionCount(task.category) >= 2 && !isTaskCompleted(task.id, task.category) && (
                                <Lock className="h-4 w-4 text-muted-foreground" />
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
                  disabled={!allCategoriesCompleted}
                />
                <div className="space-y-1">
                  <label
                    htmlFor="reviewed"
                    className={`text-sm font-medium leading-none ${
                      !allCategoriesCompleted ? 'text-muted-foreground' : 'cursor-pointer'
                    }`}
                  >
                    I have completed the orientation requirements (2 tasks per category)
                  </label>
                  {!allCategoriesCompleted && (
                    <p className="text-xs text-muted-foreground">
                      Please complete at least 2 tasks in each category before checking this box
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleProceedToSubscription}
            disabled={!canProceed || completeTaskMutation.isPending}
            className="w-full"
            size="lg"
          >
            {!allCategoriesCompleted ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Complete 2 Tasks Per Category
              </>
            ) : !hasReviewed ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Check the Box Above
              </>
            ) : completeTaskMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
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