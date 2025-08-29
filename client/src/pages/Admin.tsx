import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema, type InsertTask } from "@shared/schema";
import { Users, DollarSign, ClipboardList, UserCheck } from "lucide-react";

export default function Admin() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const { data: pendingTasks } = useQuery({
    queryKey: ['/api/admin/tasks/pending'],
  });

  const { data: withdrawals } = useQuery({
    queryKey: ['/api/admin/withdrawals'],
  });

  const taskForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "main",
      url: "",
      reward: "0",
      minTier: "member",
      minDuration: 150,
      isActive: true,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "New task has been added successfully",
      });
      taskForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const approveTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("PATCH", `/api/admin/user-tasks/${taskId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task approved",
        description: "Task has been approved and earnings added",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks/pending'] });
    },
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: number; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/user-tasks/${taskId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task rejected",
        description: "Task has been rejected with reason",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks/pending'] });
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal updated",
        description: "Withdrawal status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User approved",
        description: "User has been approved and can now access premium tasks",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User rejected",
        description: "User has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  const onCreateTask = (data: InsertTask) => {
    createTaskMutation.mutate(data);
  };

  const handleTaskApproval = (taskId: number, approve: boolean, reason?: string) => {
    if (approve) {
      approveTaskMutation.mutate(taskId);
    } else if (reason) {
      rejectTaskMutation.mutate({ taskId, reason });
    }
  };

  const handleWithdrawalUpdate = (id: number, status: string, adminNotes?: string) => {
    updateWithdrawalMutation.mutate({
      id,
      updates: { status, adminNotes },
    });
  };

  const tierEmoji = {
    member: '👤',
    silver: '🥈',
    bronze: '🥉',
    diamond: '💎',
    gold: '🏅',
    vip: '💰',
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, tasks, and platform operations</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KES {parseFloat(stats?.totalEarnings || '0').toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users?.slice(0, 5).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">
                            {user.gender === 'male' ? '🙍🏻‍♂️' : user.gender === 'female' ? '🙎‍♀️' : '🤓'}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Badge>
                          {user.subscriptionTier ? tierEmoji[user.subscriptionTier as keyof typeof tierEmoji] : '🔒'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Pending Task Reviews</span>
                      <Badge variant="secondary">{pendingTasks?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Withdrawals</span>
                      <Badge variant="secondary">
                        {withdrawals?.filter((w: any) => w.status === 'pending').length || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {user.gender === 'male' ? '🙍🏻‍♂️' : user.gender === 'female' ? '🙎‍♀️' : '🤓'}
                            </span>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>
                          {user.subscriptionTier ? (
                            <Badge>
                              {tierEmoji[user.subscriptionTier as keyof typeof tierEmoji]} {user.subscriptionTier}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No subscription</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={user.isActive ? 'bg-success' : 'bg-destructive'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            user.approvalStatus === 'approved' ? 'default' : 
                            user.approvalStatus === 'pending' ? 'secondary' : 
                            'destructive'
                          }>
                            {user.approvalStatus || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {user.approvalStatus === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approveUserMutation.mutate(user.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectUserMutation.mutate({ userId: user.id, reason: "Account review failed" })}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Task Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Create New Task</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={taskForm.handleSubmit(onCreateTask)} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Task Title</Label>
                      <Input id="title" {...taskForm.register("title")} />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" {...taskForm.register("description")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={(value) => taskForm.setValue('category', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="main">Main Tasks</SelectItem>
                            <SelectItem value="social">Social Media</SelectItem>
                            <SelectItem value="surveys">Surveys & Polls</SelectItem>
                            <SelectItem value="testing">App/Website Testing</SelectItem>
                            <SelectItem value="ai">AI Training</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="minTier">Minimum Tier</Label>
                        <Select onValueChange={(value) => taskForm.setValue('minTier', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="bronze">Bronze</SelectItem>
                            <SelectItem value="diamond">Diamond</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="reward">Reward ($ Usd)</Label>
                        <Input 
                          id="reward" 
                          type="number" 
                          step="0.01" 
                          {...taskForm.register("reward")} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="minDuration">Min Duration (seconds)</Label>
                        <Input 
                          id="minDuration" 
                          type="number" 
                          {...taskForm.register("minDuration", { valueAsNumber: true })} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="url">Task URL (optional)</Label>
                      <Input id="url" type="url" {...taskForm.register("url")} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isOrientation"
                        {...taskForm.register("isOrientation")}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isOrientation" className="text-sm font-normal">
                        Mark as Orientation Task (for new user training)
                      </Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Task Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingTasks?.map((userTask: any) => (
                    <div key={userTask.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">{userTask.task.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            by {userTask.user.name} • Started {new Date(userTask.startedAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm mt-1">{userTask.task.description}</p>
                        </div>
                        <Badge className="bg-success">KES {parseFloat(userTask.task.reward).toFixed(0)}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleTaskApproval(userTask.id, true)}
                          disabled={approveTaskMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive">Reject</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea 
                                placeholder="Enter rejection reason..."
                                id={`reason-${userTask.id}`}
                              />
                              <Button 
                                onClick={() => {
                                  const reason = (document.getElementById(`reason-${userTask.id}`) as HTMLTextAreaElement)?.value;
                                  if (reason) handleTaskApproval(userTask.id, false, reason);
                                }}
                                className="w-full"
                                disabled={rejectTaskMutation.isPending}
                              >
                                Confirm Rejection
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                  {(!pendingTasks || pendingTasks.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No pending tasks to review</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals?.map((withdrawal: any) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-medium">User #{withdrawal.userId}</TableCell>
                        <TableCell>${parseFloat(withdrawal.amount).toLocaleString()}</TableCell>
                        <TableCell>{withdrawal.phoneNumber}</TableCell>
                        <TableCell>
                          <Badge className={
                            withdrawal.status === 'completed' ? 'bg-success' :
                            withdrawal.status === 'failed' ? 'bg-destructive' : 'bg-warning'
                          }>
                            {withdrawal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(withdrawal.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {withdrawal.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleWithdrawalUpdate(withdrawal.id, 'completed')}
                                disabled={updateWithdrawalMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive">Reject</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Withdrawal</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea 
                                      placeholder="Enter rejection reason..."
                                      id={`withdrawal-reason-${withdrawal.id}`}
                                    />
                                    <Button 
                                      onClick={() => {
                                        const reason = (document.getElementById(`withdrawal-reason-${withdrawal.id}`) as HTMLTextAreaElement)?.value;
                                        handleWithdrawalUpdate(withdrawal.id, 'failed', reason);
                                      }}
                                      className="w-full"
                                      disabled={updateWithdrawalMutation.isPending}
                                    >
                                      Confirm Rejection
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
