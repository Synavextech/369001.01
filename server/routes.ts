import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertSubscriptionSchema, insertTaskSchema, insertUserTaskSchema, insertWithdrawalSchema, insertOrderSchema, insertPaymentMethodSchema, InsertOrder } from "@shared/schema";
import { z } from "zod";
import { handlePayPalWebhook, retryFailedPayment } from "./webhooks";
import { authRateLimit, sendSuccess, AppError, asyncHandler } from "./middleware";

// Subscription plan definitions
const subscriptionPlans = [
  { id: "member", price: 5 },
  { id: "silver", price: 10 },
  { id: "bronze", price: 25 },
  { id: "diamond", price: 50 },
  { id: "gold", price: 75 },
  { id: "vip", price: 100 }
];

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: "Logged out successfully" });
  });

  // Middleware to check authentication
  const authenticateUser = async (req: any, res: any, next: any) => {
    const token = req.cookies?.auth_token;
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const user = await storage.getUser(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };

  app.post("/api/auth/register", authRateLimit, asyncHandler(async (req: Request, res: Response) => {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      throw new AppError("User already exists with this email", 409, "USER_EXISTS");
    }

    const user = await storage.createUser(userData);
    const { password, ...userWithoutPassword } = user;

    sendSuccess(res, { user: userWithoutPassword }, "User registered successfully", 201);
  }));

  app.post("/api/auth/login", authRateLimit, asyncHandler(async (req: Request, res: Response) => {
    const credentials = loginSchema.parse(req.body);
    const user = await storage.authenticateUser(credentials);
    
    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Set secure cookie with user token
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      iat: Date.now()
    })).toString('base64');
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    const { password, ...userWithoutPassword } = user;
    sendSuccess(res, { user: userWithoutPassword }, "Login successful");
  }));

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  app.get("/api/users/:id/wallet", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      res.json(wallet);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  app.get("/api/users/:id/transactions", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  app.get("/api/users/:id/notifications", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationRead(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Invalid notification ID" });
    }
  });

  // Subscription routes
  app.post("/api/subscriptions", async (req, res) => {
    try {
      const subscriptionData = insertSubscriptionSchema.parse(req.body);
      const userId = parseInt(req.body.userId);
      
      // In production, integrate with M-Pesa STK Push here
      const subscription = await storage.createSubscription({
        ...subscriptionData,
        userId,
        paymentReference: `MPESA_${Date.now()}`, // Mock reference
        isActive: true,
      });

      // Create success notification
      await storage.createNotification({
        userId,
        title: "Subscription Activated",
        message: `Your ${subscription.tier} subscription has been activated successfully.`,
        type: "subscription",
        isRead: false,
        metadata: { subscriptionId: subscription.id },
      });

      res.json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Invalid subscription data", error });
    }
  });

  app.get("/api/subscriptions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      res.json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const { category, minTier } = req.query;
      const tasks = await storage.getTasks(
        category as string, 
        minTier as string
      );
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });

  // Orientation tasks route
  app.get("/api/tasks/orientation", async (req, res) => {
    try {
      const tasks = await storage.getOrientationTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orientation tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data", error });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      const task = await storage.updateTask(taskId, updates);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const success = await storage.deleteTask(taskId);
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Invalid task ID" });
    }
  });

  // User task routes
  app.post("/api/user-tasks", async (req, res) => {
    try {
      const userTaskData = insertUserTaskSchema.parse(req.body);
      const userId = parseInt(req.body.userId);
      
      // Get user to check subscription tier
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user is in orientation mode (no daily limits apply)
      const orientationStatus = user.orientationStatus as any;
      const isInOrientation = orientationStatus && !orientationStatus.overallCompleted;
      
      // If not in orientation, check daily task limits
      if (!isInOrientation && user.subscriptionTier) {
        const { getTierLimits } = await import("./utils");
        const tierLimits = getTierLimits(user.subscriptionTier);
        const tasksCountToday = await storage.getUserTasksCountToday(userId);
        
        if (tasksCountToday >= tierLimits.dailyTasks) {
          return res.status(403).json({ 
            message: `Daily task limit reached. Your ${user.subscriptionTier} tier allows ${tierLimits.dailyTasks} tasks per day.` 
          });
        }
      }
      
      const userTask = await storage.createUserTask({
        ...userTaskData,
        userId,
      });

      res.json(userTask);
    } catch (error) {
      res.status(400).json({ message: "Invalid user task data", error });
    }
  });

  // Orientation task completion route
  app.post("/api/orientation/complete-task", async (req, res) => {
    try {
      const { userId, taskId, category } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const orientationStatus = user.orientationStatus as any;
      
      // Add task to completed tasks for the category
      if (!orientationStatus[category].completedTasks.includes(taskId)) {
        orientationStatus[category].completedTasks.push(taskId);
        
        // Check if category is completed (2 tasks)
        if (orientationStatus[category].completedTasks.length >= 2) {
          orientationStatus[category].isCompleted = true;
        }
        
        // Check if overall orientation is completed
        const categories = ['main', 'social', 'surveys', 'testing', 'ai'];
        const allCompleted = categories.every(cat => orientationStatus[cat].isCompleted);
        orientationStatus.overallCompleted = allCompleted;
        
        // Update user
        await storage.updateUser(userId, { orientationStatus });
      }

      res.json({ orientationStatus });
    } catch (error) {
      res.status(400).json({ message: "Error updating orientation status", error });
    }
  });

  app.get("/api/user-tasks/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userTasks = await storage.getUserTasks(userId);
      res.json(userTasks);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  app.patch("/api/user-tasks/:id", async (req, res) => {
    try {
      const userTaskId = parseInt(req.params.id);
      const updates = req.body;
      const userTask = await storage.updateUserTask(userTaskId, updates);
      
      if (!userTask) {
        return res.status(404).json({ message: "User task not found" });
      }

      res.json(userTask);
    } catch (error) {
      res.status(400).json({ message: "Invalid user task data" });
    }
  });

  // Withdrawal routes
  app.post("/api/withdrawals", async (req, res) => {
    try {
      const withdrawalData = insertWithdrawalSchema.parse(req.body);
      const userId = parseInt(req.body.userId);
      
      const withdrawal = await storage.createWithdrawal({
        ...withdrawalData,
        userId,
      });

      // Create notification
      await storage.createNotification({
        userId,
        title: "Withdrawal Request Submitted",
        message: `Your withdrawal request for KES ${withdrawal.amount} has been submitted for review.`,
        type: "payment",
        isRead: false,
        metadata: { withdrawalId: withdrawal.id },
      });

      res.json(withdrawal);
    } catch (error) {
      res.status(400).json({ message: "Invalid withdrawal data", error });
    }
  });

  app.get("/api/withdrawals/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const withdrawals = await storage.getWithdrawals(userId);
      res.json(withdrawals);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPins = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPins);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  app.get("/api/admin/tasks/pending", async (req, res) => {
    try {
      const pendingTasks = await storage.getPendingTasks();
      res.json(pendingTasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending tasks" });
    }
  });

  app.patch("/api/admin/user-tasks/:id/approve", async (req, res) => {
    try {
      const userTaskId = parseInt(req.params.id);
      const userTask = await storage.updateUserTask(userTaskId, {
        status: 'approved',
        approvedAt: new Date(),
      });
      
      if (!userTask) {
        return res.status(404).json({ message: "User task not found" });
      }

      // Add earnings to user wallet
      // Implementation would include wallet update logic

      res.json(userTask);
    } catch (error) {
      res.status(400).json({ message: "Error approving task" });
    }
  });

  app.patch("/api/admin/user-tasks/:id/reject", async (req, res) => {
    try {
      const userTaskId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const userTask = await storage.updateUserTask(userTaskId, {
        status: 'rejected',
        rejectionReason: reason,
      });
      
      if (!userTask) {
        return res.status(404).json({ message: "User task not found" });
      }

      res.json(userTask);
    } catch (error) {
      res.status(400).json({ message: "Error rejecting task" });
    }
  });

  app.get("/api/admin/withdrawals", async (req, res) => {
    try {
      const withdrawals = await storage.getWithdrawals();
      res.json(withdrawals);
    } catch (error) {
      res.status(500).json({ message: "Error fetching withdrawals" });
    }
  });

  app.patch("/api/admin/withdrawals/:id", async (req, res) => {
    try {
      const withdrawalId = parseInt(req.params.id);
      const updates = req.body;
      
      const withdrawal = await storage.updateWithdrawal(withdrawalId, updates);
      
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }

      // Create notification for user
      await storage.createNotification({
        userId: withdrawal.userId,
        title: updates.status === 'completed' ? "Withdrawal Processed" : "Withdrawal Rejected",
        message: updates.status === 'completed' 
          ? `Your withdrawal of KES ${withdrawal.amount} has been processed.`
          : `Your withdrawal was rejected: ${updates.adminNotes || 'No reason provided'}`,
        type: "payment",
        isRead: false,
        metadata: { withdrawalId: withdrawal.id },
      });

      res.json(withdrawal);
    } catch (error) {
      res.status(400).json({ message: "Error updating withdrawal" });
    }
  });

  // Admin approval routes
  app.patch("/api/admin/users/:id/approve", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.updateUser(userId, { approvalStatus: 'approved' });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create notification for user
      await storage.createNotification({
        userId,
        title: "Account Approved",
        message: "Your account has been approved! You now have full access to premium tasks.",
        type: "system",
        isRead: false,
        metadata: { approvalStatus: 'approved' },
      });

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Error approving user" });
    }
  });

  app.patch("/api/admin/users/:id/reject", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const user = await storage.updateUser(userId, { approvalStatus: 'rejected' });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create notification for user
      await storage.createNotification({
        userId,
        title: "Account Rejected",
        message: `Your account approval was rejected. ${reason || 'Please contact support for more information.'}`,
        type: "system",
        isRead: false,
        metadata: { approvalStatus: 'rejected', reason },
      });

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Error rejecting user" });
    }
  });

  // Order routes
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data", error });
    }
  });

  app.get("/api/orders/:orderId", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Error fetching order" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const updates = req.body;
      
      const order = await storage.updateOrder(orderId, updates);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Error updating order" });
    }
  });

  app.get("/api/users/:userId/orders", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  // Payment method routes
  app.post("/api/payment-methods", async (req, res) => {
    try {
      const paymentMethodData = insertPaymentMethodSchema.parse(req.body);
      const userId = parseInt(req.body.userId);
      
      const paymentMethod = await storage.createPaymentMethod({
        ...paymentMethodData,
        userId,
      });

      res.json(paymentMethod);
    } catch (error) {
      res.status(400).json({ message: "Invalid payment method data", error });
    }
  });

  app.get("/api/users/:userId/payment-methods", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const paymentMethods = await storage.getUserPaymentMethods(userId);
      res.json(paymentMethods);
    } catch (error) {
      res.status(400).json({ message: "Invalid user ID" });
    }
  });

  app.patch("/api/payment-methods/:id", async (req, res) => {
    try {
      const methodId = parseInt(req.params.id);
      const updates = req.body;
      
      const paymentMethod = await storage.updatePaymentMethod(methodId, updates);
      
      if (!paymentMethod) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      res.json(paymentMethod);
    } catch (error) {
      res.status(400).json({ message: "Error updating payment method" });
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      const methodId = parseInt(req.params.id);
      const success = await storage.deletePaymentMethod(methodId);
      
      if (!success) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Error deleting payment method" });
    }
  });

  app.patch("/api/users/:userId/payment-methods/:methodId/set-primary", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const methodId = parseInt(req.params.methodId);
      
      const success = await storage.setPrimaryPaymentMethod(userId, methodId);
      
      if (!success) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Error setting primary payment method" });
    }
  });

  // PayPal Integration Routes
  const { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } = await import('./paypal');

  // PayPal Setup Route
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  // Create PayPal Order
  app.post("/api/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  // Capture PayPal Order
  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // PayPal Success Redirect
  app.get("/api/paypal/success", async (req, res) => {
    const { token } = req.query;
    res.redirect(`/subscription-success?orderId=${token}`);
  });

  // PayPal Cancel Redirect
  app.get("/api/paypal/cancel", async (req, res) => {
    res.redirect('/subscription?cancelled=true');
  });

  // Add middleware to handle subscription data in order creation
  app.use("/api/paypal/order", authenticateUser, async (req, res, next) => {
    if (req.method === 'POST' && req.body.tier) {
      // Store subscription tier in session or request for later use
      (req as any).subscriptionTier = req.body.tier;
      // Calculate the actual amount based on tier
      const tier = subscriptionPlans.find(p => p.id === req.body.tier);
      if (tier) {
        req.body.amount = tier.price.toString();
      }
    }
    next();
  });

  // Handle successful payment capture
  app.post("/api/paypal/order/:orderID/capture", authenticateUser, async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Intercept the response to handle subscription creation
    res.json = function(data: any) {
      if (data && data.status === 'COMPLETED') {
        // Create subscription after successful capture
        const subscriptionTier = (req as any).subscriptionTier || 'member';
        const userId = (req as any).user.id;
        
        // Create subscription in database
        storage.createSubscription({
          userId: userId,
          tier: subscriptionTier as any,
          amount: data.purchase_units[0].amount.value,
          paymentMethod: 'paypal' as const,
          paymentReference: data.id,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }).then(() => {
          // Update user subscription
          return storage.updateUser(userId, {
            subscriptionTier: subscriptionTier as any,
            subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
        }).catch(error => {
          console.error('Failed to create subscription:', error);
        });
      }
      
      return originalJson.call(this, data);
    };
    
    // Continue with the PayPal capture
    await capturePaypalOrder(req, res);
  });

  // Webhook routes
  app.post("/api/webhooks/paypal", asyncHandler(handlePayPalWebhook));
  
  // Payment recovery routes
  app.post("/api/payments/retry/:orderId", authenticateUser, asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await retryFailedPayment(orderId);
    sendSuccess(res, result);
  }));

  // Token refresh route
  app.post("/api/auth/refresh", asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.auth_token;
    
    if (!token) {
      throw new AppError("No token provided", 401, "NO_TOKEN");
    }
    
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const user = await storage.getUser(decoded.userId);
      
      if (!user) {
        throw new AppError("Invalid token", 401, "INVALID_TOKEN");
      }
      
      // Check if token is older than 7 days, refresh it
      const tokenAge = Date.now() - (decoded.iat || 0);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      if (tokenAge > sevenDays) {
        // Issue new token
        const newToken = Buffer.from(JSON.stringify({
          userId: user.id,
          email: user.email,
          iat: Date.now()
        })).toString('base64');
        
        res.cookie('auth_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }
      
      const { password, ...userWithoutPassword } = user;
      sendSuccess(res, { user: userWithoutPassword }, "Token refreshed");
    } catch (error) {
      throw new AppError("Invalid token", 401, "INVALID_TOKEN");
    }
  }));

  const httpServer = createServer(app);
  return httpServer;
}
