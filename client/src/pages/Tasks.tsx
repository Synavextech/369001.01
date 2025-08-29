import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const taskCategories = [
  {
    id: "main",
    name: "Main Tasks",
    icon: "📋",
    description: "Basic task assignments",
    minTier: "member",
  },
  {
    id: "social",
    name: "Social Media",
    icon: "👥",
    description: "Engagement tasks",
    minTier: "silver",
  },
  {
    id: "surveys",
    name: "Surveys & Polls",
    icon: "📊",
    description: "Opinion gathering",
    minTier: "diamond",
  },
  {
    id: "testing",
    name: "App/Website Testing",
    icon: "⚙️",
    description: "Quality assurance",
    minTier: "gold",
  },
  {
    id: "ai",
    name: "AI Training",
    icon: "🤖",
    description: "Machine learning tasks",
    minTier: "vip",
  },
];

const tierOrder = ["member", "silver", "bronze", "diamond", "gold", "vip"];

export default function Tasks() {
  const [showCategories, setShowCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if user is in orientation mode
  const orientationStatus = user?.orientationStatus as any;
  const isInOrientation = orientationStatus && !orientationStatus.overallCompleted;

  const { data: tasks } = useQuery<any[]>({
    queryKey: ["/api/tasks", selectedCategory, user?.subscriptionTier],
    enabled: !!selectedCategory && !!user?.subscriptionTier,
  });

  const { data: userTasks } = useQuery<any[]>({
    queryKey: [`/api/user-tasks/${user?.id}`],
    enabled: !!user?.id,
  });

  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId, category }: { taskId: number; category?: string }) => {
      const response = await apiRequest("POST", "/api/user-tasks", {
        taskId,
        userId: user?.id,
      });
      const result = await response.json();
      
      // If in orientation mode, also track orientation completion
      if (isInOrientation && category) {
        await apiRequest("POST", "/api/orientation/complete-task", {
          userId: user?.id,
          taskId,
          category,
        });
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Task started!",
        description: "You can now complete the task requirements.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/user-tasks/${user?.id}`],
      });
      
      // Refresh user data to get updated orientation status
      if (isInOrientation) {
        window.location.reload();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const canAccessCategory = (minTier: string) => {
    // In orientation mode, users can access all categories
    if (isInOrientation) return true;
    
    if (!user?.subscriptionTier) return false;
    const userTierIndex = tierOrder.indexOf(user.subscriptionTier);
    const minTierIndex = tierOrder.indexOf(minTier);
    return userTierIndex >= minTierIndex;
  };

  const getAccessBadge = (minTier: string) => {
    if (canAccessCategory(minTier)) {
      return (
        <Badge className="bg-success text-success-foreground">Available</Badge>
      );
    }

    const tierNames = {
      silver: "Silver+",
      bronze: "Bronze+",
      diamond: "Diamond+",
      gold: "Gold+",
      vip: "VIP Only",
    };

    return (
      <Badge variant="secondary">
        {tierNames[minTier as keyof typeof tierNames] || "Locked"}
      </Badge>
    );
  };

  if (!showCategories && selectedCategory) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {taskCategories.find((c) => c.id === selectedCategory)?.name}{" "}
              Tasks
            </h1>
            <Button
              variant="outline"
              onClick={() => {
                setShowCategories(true);
                setSelectedCategory(null);
              }}
            >
              ← Back to Categories
            </Button>
          </div>

          <div className="grid gap-4">
            {tasks
              ?.filter((task: any) => {
                // In orientation mode, show only orientation tasks
                if (isInOrientation) {
                  return task.isOrientation === true;
                }
                // Otherwise, show only non-orientation tasks
                return task.isOrientation === false;
              })
              ?.map((task: any) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {task.description}
                      </p>
                    </div>
                    <Badge className="bg-success text-success-foreground">
                      ${parseFloat(task.reward).toFixed(0)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Min. time: {Math.floor(task.minDuration / 60)}:
                      {(task.minDuration % 60).toString().padStart(2, "0")}
                    </div>
                    <Button
                      onClick={() => startTaskMutation.mutate({ taskId: task.id, category: selectedCategory })}
                      disabled={startTaskMutation.isPending}
                    >
                      {startTaskMutation.isPending
                        ? "Starting..."
                        : "Start Task"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!tasks || tasks.filter((task: any) => {
              if (isInOrientation) {
                return task.isOrientation === true;
              }
              return task.isOrientation === false;
            }).length === 0) && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    {isInOrientation 
                      ? "No orientation tasks available in this category."
                      : "No tasks available in this category at the moment."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">Task Manager</h1>
          {isInOrientation ? (
            <div className="bg-accent/10 rounded-lg p-4 mb-4 max-w-2xl mx-auto">
              <p className="text-sm font-medium text-accent mb-2">
                🎯 Orientation Mode Active
              </p>
              <p className="text-sm text-muted-foreground">
                Complete 2 tasks in each category to finish your orientation. You have full access to all task categories!
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mb-4">
              Welcome {user?.name?.split(" ")[0]}! Our tasks are the simplest of
              all in the online working industry so we expect maximum quality.
              Anything less than perfect is a failure here 😎
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setShowCategories(true)}
              className="bg-accent hover:bg-accent/90"
            >
              ✍🏼 Get Tasks
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCategories(false)}
            >
              📝 Your Task History
            </Button>
          </div>
        </div>

        {showCategories ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taskCategories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  canAccessCategory(category.minTier)
                    ? "hover:border-accent"
                    : "opacity-60"
                }`}
                onClick={() => {
                  if (canAccessCategory(category.minTier)) {
                    setSelectedCategory(category.id);
                    setShowCategories(false);
                  } else {
                    toast({
                      title: "Access Restricted",
                      description: `This category requires ${category.minTier}+ subscription`,
                      variant: "destructive",
                    });
                  }
                }}
              >
                <CardContent className="text-center p-6">
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {category.description}
                  </p>
                  {isInOrientation && orientationStatus[category.id] && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Orientation: {orientationStatus[category.id].completedTasks?.length || 0}/2 completed
                      {orientationStatus[category.id].isCompleted && " ✓"}
                    </div>
                  )}
                  {getAccessBadge(category.minTier)}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Task History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTasks?.length > 0 ? (
                    userTasks.map((userTask: any) => (
                      <TableRow key={userTask.id}>
                        <TableCell className="font-medium">
                          Task #{userTask.taskId}
                        </TableCell>
                        <TableCell>
                          {new Date(userTask.startedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              userTask.status === "approved"
                                ? "bg-success text-success-foreground"
                                : userTask.status === "rejected"
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-warning text-warning-foreground"
                            }
                          >
                            {userTask.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{userTask.rejectionReason || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No task history available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
