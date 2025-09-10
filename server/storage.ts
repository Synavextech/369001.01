import { users, subscriptions, tasks, userTasks, wallets, transactions, withdrawals, notifications, orders, paymentMethods, type User, type InsertUser, type LoginCredentials, type Subscription, type InsertSubscription, type Task, type InsertTask, type UserTask, type InsertUserTask, type Wallet, type Transaction, type Withdrawal, type InsertWithdrawal, type Notification, type Order, type InsertOrder, type PaymentMethod, type InsertPaymentMethod } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateReferralCode as generateRefCode, hashPassword as hashPasswordUtil, verifyPassword } from "./utils";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Authentication
  authenticateUser(credentials: LoginCredentials): Promise<User | undefined>;
  
  // Subscriptions
  createSubscription(subscription: InsertSubscription & { userId: number }): Promise<Subscription>;
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  
  // Tasks
  getTasks(category?: string, minTier?: string): Promise<Task[]>;
  getOrientationTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // User Tasks
  createUserTask(userTask: InsertUserTask & { userId: number }): Promise<UserTask>;
  getUserTasks(userId: number): Promise<UserTask[]>;
  getUserTasksCountToday(userId: number): Promise<number>;
  updateUserTask(id: number, updates: Partial<UserTask>): Promise<UserTask | undefined>;
  getPendingTasks(): Promise<(UserTask & { user: User; task: Task })[]>;
  
  // Wallet
  getWallet(userId: number): Promise<Wallet | undefined>;
  createWallet(userId: number): Promise<Wallet>;
  updateWallet(userId: number, updates: Partial<Wallet>): Promise<Wallet | undefined>;
  
  // Transactions
  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  
  // Withdrawals
  createWithdrawal(withdrawal: InsertWithdrawal & { userId: number }): Promise<Withdrawal>;
  getWithdrawals(userId?: number): Promise<Withdrawal[]>;
  updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined>;
  
  // Notifications
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<boolean>;
  
  // Admin
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{ totalUsers: number; activeSubscriptions: number; totalEarnings: string; totalTasks: number }>;
  
  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(orderId: string): Promise<Order | undefined>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  
  // Payment Methods
  createPaymentMethod(paymentMethod: InsertPaymentMethod & { userId: number }): Promise<PaymentMethod>;
  getUserPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  updatePaymentMethod(id: number, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<boolean>;
  setPrimaryPaymentMethod(userId: number, methodId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private subscriptions: Map<number, Subscription>;
  private tasks: Map<number, Task>;
  private userTasks: Map<number, UserTask>;
  private wallets: Map<number, Wallet>;
  private transactions: Map<number, Transaction>;
  private withdrawals: Map<number, Withdrawal>;
  private notifications: Map<number, Notification>;
  private orders: Map<number, Order>;
  private paymentMethods: Map<number, PaymentMethod>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.subscriptions = new Map();
    this.tasks = new Map();
    this.userTasks = new Map();
    this.wallets = new Map();
    this.transactions = new Map();
    this.withdrawals = new Map();
    this.notifications = new Map();
    this.orders = new Map();
    this.paymentMethods = new Map();
    this.currentId = 1;
    // Initialize seed data asynchronously
    this.seedData().catch(console.error);
  }

  private async seedData() {
    // Create sample admin user with hashed password
    const hashedPassword = await hashPasswordUtil("12345678");
    const adminUser: User = {
      id: this.currentId++,
      name: "Admin User",
      phone: "+254700000001",
      email: "admin@promog.com",
      password: hashedPassword,
      gender: "geek",
      role: "admin",
      subscriptionTier: "vip",
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      referralCode: generateRefCode(),
      referredBy: null,
      isActive: true,
      approvalStatus: "approved",
      orientationStatus: {
        main: { completedTasks: [], isCompleted: true },
        social: { completedTasks: [], isCompleted: true },
        surveys: { completedTasks: [], isCompleted: true },
        testing: { completedTasks: [], isCompleted: true },
        ai: { completedTasks: [], isCompleted: true },
        overallCompleted: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample tasks
    const sampleTasks: Task[] = [
      // Orientation tasks (2 per category for new users)
      {
        id: this.currentId++,
        title: "Introduction to Website Reviews",
        description: "Learn how to properly review websites by visiting our tutorial page",
        category: "main",
        url: "https://example.com/tutorial",
        reward: "20.00",
        minTier: "member",
        minDuration: 120,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "Your First Website Review",
        description: "Practice website reviewing with this simple task",
        category: "main",
        url: "https://example.com/practice",
        reward: "25.00",
        minTier: "member",
        minDuration: 150,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "Social Media Basics",
        description: "Learn how to properly engage with social media content",
        category: "social",
        url: "https://instagram.com/tutorial",
        reward: "15.00",
        minTier: "member",
        minDuration: 60,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "First Social Engagement",
        description: "Practice liking and commenting on social posts",
        category: "social",
        url: "https://instagram.com/practice",
        reward: "20.00",
        minTier: "member",
        minDuration: 60,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "Survey Tutorial",
        description: "Learn how to complete surveys effectively",
        category: "surveys",
        url: null,
        reward: "30.00",
        minTier: "member",
        minDuration: 180,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "Practice Survey",
        description: "Complete your first practice survey",
        category: "surveys",
        url: null,
        reward: "35.00",
        minTier: "member",
        minDuration: 240,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "App Testing Introduction",
        description: "Learn the basics of app testing and feedback",
        category: "testing",
        url: "https://app.example.com/tutorial",
        reward: "40.00",
        minTier: "member",
        minDuration: 300,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "First App Test",
        description: "Test a simple app and provide basic feedback",
        category: "testing",
        url: "https://app.example.com/practice",
        reward: "50.00",
        minTier: "member",
        minDuration: 360,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "AI Training Basics",
        description: "Introduction to AI data labeling tasks",
        category: "ai",
        url: null,
        reward: "45.00",
        minTier: "member",
        minDuration: 300,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "First AI Task",
        description: "Complete your first AI training task",
        category: "ai",
        url: null,
        reward: "55.00",
        minTier: "member",
        minDuration: 420,
        isActive: true,
        isOrientation: true,
        createdAt: new Date(),
      },
      // Regular tasks
      {
        id: this.currentId++,
        title: "Visit Website and Review",
        description: "Visit the provided website and spend at least 2.5 minutes reviewing the content",
        category: "main",
        url: "https://example.com",
        reward: "50.00",
        minTier: "member",
        minDuration: 150,
        isActive: true,
        isOrientation: false,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "Instagram Post Engagement",
        description: "Like and comment on the provided Instagram post",
        category: "social",
        url: "https://instagram.com/example",
        reward: "25.00",
        minTier: "member",
        minDuration: 60,
        isActive: true,
        isOrientation: false,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "Product Survey",
        description: "Complete a 10-question survey about product preferences",
        category: "surveys",
        url: null,
        reward: "75.00",
        minTier: "bronze",
        minDuration: 300,
        isActive: true,
        isOrientation: false,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "Mobile App Testing",
        description: "Test a mobile app and provide detailed feedback",
        category: "testing",
        url: "https://app.example.com",
        reward: "150.00",
        minTier: "gold",
        minDuration: 600,
        isActive: true,
        isOrientation: false,
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        title: "AI Training Data",
        description: "Help train AI models by completing data labeling tasks",
        category: "ai",
        url: null,
        reward: "200.00",
        minTier: "vip",
        minDuration: 900,
        isActive: true,
        isOrientation: false,
        createdAt: new Date(),
      },
    ];

    sampleTasks.forEach(task => this.tasks.set(task.id, task));
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phone === phone);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const referralCode = generateRefCode();
    const hashedPassword = await hashPasswordUtil(insertUser.password);
    const user: User = {
      ...insertUser,
      id,
      phone: insertUser.phone || null,
      password: hashedPassword,
      role: "user",
      subscriptionTier: null,
      subscriptionExpiry: null,
      referralCode,
      referredBy: insertUser.referredBy || null,
      isActive: true,
      approvalStatus: insertUser.approvalStatus ?? 'pending',
      orientationStatus: {
        main: { completedTasks: [], isCompleted: false },
        social: { completedTasks: [], isCompleted: false },
        surveys: { completedTasks: [], isCompleted: false },
        testing: { completedTasks: [], isCompleted: false },
        ai: { completedTasks: [], isCompleted: false },
        overallCompleted: false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);

    // Create wallet for new user
    await this.createWallet(id);

    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async authenticateUser(credentials: LoginCredentials): Promise<User | undefined> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) {
      return undefined;
    }
    
    const isValidPassword = await verifyPassword(credentials.password, user.password);
    if (!isValidPassword) {
      return undefined;
    }
    
    return user;
  }

  async createSubscription(subscription: InsertSubscription & { userId: number }): Promise<Subscription> {
    const id = this.currentId++;
    const newSubscription: Subscription = {
      ...subscription,
      id,
      isActive: subscription.isActive ?? true,
      paymentMethod: subscription.paymentMethod ?? 'paypal',
      paymentReference: subscription.paymentReference ?? null,
      createdAt: new Date(),
    };
    this.subscriptions.set(id, newSubscription);

    // Update user subscription
    await this.updateUser(subscription.userId, {
      subscriptionTier: subscription.tier,
      subscriptionExpiry: subscription.expiresAt,
    });

    return newSubscription;
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      sub => sub.userId === userId && sub.isActive
    );
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;

    const updated = { ...subscription, ...updates };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async getTasks(category?: string, minTier?: string): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values()).filter(task => task.isActive);
    
    if (category) {
      tasks = tasks.filter(task => task.category === category);
    }
    
    if (minTier) {
      const tierOrder = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip'];
      const minTierIndex = tierOrder.indexOf(minTier);
      tasks = tasks.filter(task => {
        const taskTierIndex = tierOrder.indexOf(task.minTier);
        return taskTierIndex <= minTierIndex;
      });
    }

    return tasks;
  }

  async getOrientationTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.isActive && task.isOrientation);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentId++;
    const newTask: Task = {
      ...task,
      id,
      isActive: task.isActive ?? true,
      isOrientation: task.isOrientation ?? false,
      url: task.url ?? null,
      minDuration: task.minDuration ?? 150,
      createdAt: new Date(),
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated = { ...task, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getUserTasksCountToday(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userTasks = Array.from(this.userTasks.values()).filter(ut => {
      if (ut.userId !== userId) return false;
      const taskDate = new Date(ut.startedAt);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    });
    
    return userTasks.length;
  }

  async createUserTask(userTask: InsertUserTask & { userId: number }): Promise<UserTask> {
    const id = this.currentId++;
    const newUserTask: UserTask = {
      ...userTask,
      id,
      status: userTask.status ?? 'pending',
      startedAt: new Date(),
      completedAt: null,
      approvedAt: null,
      rejectionReason: null,
      metadata: null,
    };
    this.userTasks.set(id, newUserTask);
    return newUserTask;
  }

  async getUserTasks(userId: number): Promise<UserTask[]> {
    return Array.from(this.userTasks.values()).filter(ut => ut.userId === userId);
  }

  async updateUserTask(id: number, updates: Partial<UserTask>): Promise<UserTask | undefined> {
    const userTask = this.userTasks.get(id);
    if (!userTask) return undefined;

    const updated = { ...userTask, ...updates };
    this.userTasks.set(id, updated);
    return updated;
  }

  async getPendingTasks(): Promise<(UserTask & { user: User; task: Task })[]> {
    const pendingTasks = Array.from(this.userTasks.values()).filter(ut => ut.status === 'pending');
    return pendingTasks.map(ut => ({
      ...ut,
      user: this.users.get(ut.userId)!,
      task: this.tasks.get(ut.taskId)!,
    }));
  }

  async getWallet(userId: number): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(w => w.userId === userId);
  }

  async createWallet(userId: number): Promise<Wallet> {
    const id = this.currentId++;
    const wallet: Wallet = {
      id,
      userId,
      availableBalance: "0",
      pendingBalance: "0",
      totalEarnings: "0",
      totalWithdrawn: "0",
      updatedAt: new Date(),
    };
    this.wallets.set(id, wallet);
    return wallet;
  }

  async updateWallet(userId: number, updates: Partial<Wallet>): Promise<Wallet | undefined> {
    const wallet = await this.getWallet(userId);
    if (!wallet) return undefined;

    const updated = { ...wallet, ...updates, updatedAt: new Date() };
    this.wallets.set(wallet.id, updated);
    return updated;
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const id = this.currentId++;
    const newTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createWithdrawal(withdrawal: InsertWithdrawal & { userId: number }): Promise<Withdrawal> {
    const id = this.currentId++;
    const newWithdrawal: Withdrawal = {
      ...withdrawal,
      id,
      paymentMethodId: withdrawal.paymentMethodId ?? null,
      status: withdrawal.status ?? 'pending',
      processedAt: null,
      adminNotes: null,
      createdAt: new Date(),
    };
    this.withdrawals.set(id, newWithdrawal);
    return newWithdrawal;
  }

  async getWithdrawals(userId?: number): Promise<Withdrawal[]> {
    let withdrawals = Array.from(this.withdrawals.values());
    if (userId) {
      withdrawals = withdrawals.filter(w => w.userId === userId);
    }
    return withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
    const withdrawal = this.withdrawals.get(id);
    if (!withdrawal) return undefined;

    const updated = { ...withdrawal, ...updates };
    if (updates.status && updates.status !== 'pending') {
      updated.processedAt = new Date();
    }
    this.withdrawals.set(id, updated);
    return updated;
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const id = this.currentId++;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    this.notifications.set(id, { ...notification, isRead: true });
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserStats(): Promise<{ totalUsers: number; activeSubscriptions: number; totalEarnings: string; totalTasks: number }> {
    const totalUsers = this.users.size;
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(s => s.isActive).length;
    const totalEarnings = Array.from(this.wallets.values())
      .reduce((sum, wallet) => sum + parseFloat(wallet.totalEarnings), 0)
      .toFixed(2);
    const totalTasks = this.userTasks.size;

    return { totalUsers, activeSubscriptions, totalEarnings, totalTasks };
  }

  // Orders
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentId++;
    const newOrder: Order = {
      id,
      ...order,
      status: order.status ?? 'pending',
      currency: order.currency ?? 'USD',
      payerId: order.payerId ?? null,
      payerEmail: order.payerEmail ?? null,
      metadata: order.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(o => o.orderId === orderId);
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Payment Methods
  async createPaymentMethod(paymentMethod: InsertPaymentMethod & { userId: number }): Promise<PaymentMethod> {
    const id = this.currentId++;
    const newMethod: PaymentMethod = {
      id,
      ...paymentMethod,
      type: paymentMethod.type ?? 'paypal',
      isPrimary: paymentMethod.isPrimary ?? false,
      isActive: paymentMethod.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.paymentMethods.set(id, newMethod);
    return newMethod;
  }

  async getUserPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return Array.from(this.paymentMethods.values())
      .filter(pm => pm.userId === userId && pm.isActive)
      .sort((a, b) => b.isPrimary ? 1 : -1);
  }

  async updatePaymentMethod(id: number, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const method = this.paymentMethods.get(id);
    if (!method) return undefined;

    const updatedMethod = { ...method, ...updates, updatedAt: new Date() };
    this.paymentMethods.set(id, updatedMethod);
    return updatedMethod;
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const method = this.paymentMethods.get(id);
    if (!method) return false;

    this.paymentMethods.set(id, { ...method, isActive: false, updatedAt: new Date() });
    return true;
  }

  async setPrimaryPaymentMethod(userId: number, methodId: number): Promise<boolean> {
    // First, set all user's methods to non-primary
    const userMethods = await this.getUserPaymentMethods(userId);
    for (const method of userMethods) {
      await this.updatePaymentMethod(method.id, { isPrimary: false });
    }

    // Then set the selected method as primary
    const result = await this.updatePaymentMethod(methodId, { isPrimary: true });
    return result !== undefined;
  }

  async getOrderByPayPalId(paypalOrderId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(o => o.orderId === paypalOrderId);
  }
}

// Utility functions (would normally be in separate file)
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function hashPin(pin: string): string {
  // In production, use bcrypt or similar
  return `hashed_${pin}`;
}

export const storage = new MemStorage();
