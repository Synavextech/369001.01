import { db } from "./db";
import { users, subscriptions, tasks, userTasks, wallets, transactions, withdrawals, notifications, orders, paymentMethods, type User, type InsertUser, type LoginCredentials, type Subscription, type InsertSubscription, type Task, type InsertTask, type UserTask, type InsertUserTask, type Wallet, type Transaction, type Withdrawal, type InsertWithdrawal, type Notification, type Order, type InsertOrder, type PaymentMethod, type InsertPaymentMethod } from "@shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { generateReferralCode, hashPassword, verifyPassword } from "./utils";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const referralCode = generateReferralCode();
    const hashedPassword = await hashPassword(insertUser.password);
    
    const userData = {
      ...insertUser,
      password: hashedPassword,
      role: "user" as const,
      subscriptionTier: null,
      subscriptionExpiry: null,
      referralCode,
      referredBy: insertUser.referredBy || null,
      isActive: true,
      approvalStatus: insertUser.approvalStatus ?? 'pending' as const,
      orientationStatus: {
        main: { completedTasks: [], isCompleted: false },
        social: { completedTasks: [], isCompleted: false },
        surveys: { completedTasks: [], isCompleted: false },
        testing: { completedTasks: [], isCompleted: false },
        ai: { completedTasks: [], isCompleted: false },
        overallCompleted: false
      },
    };

    const result = await db.insert(users).values(userData).returning();
    const user = result[0];

    // Create wallet for new user
    await this.createWallet(user.id);

    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Authentication
  async authenticateUser(credentials: LoginCredentials): Promise<User | undefined> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) return undefined;
    
    const isValidPassword = await verifyPassword(credentials.password, user.password);
    if (!isValidPassword) return undefined;
    
    return user;
  }

  // Subscriptions
  async createSubscription(subscription: InsertSubscription & { userId: number }): Promise<Subscription> {
    const result = await db.insert(subscriptions).values({
      ...subscription,
      isActive: subscription.isActive ?? true,
      paymentMethod: subscription.paymentMethod ?? 'paypal',
      paymentReference: subscription.paymentReference ?? null,
    }).returning();

    const newSubscription = result[0];

    // Update user subscription
    await this.updateUser(subscription.userId, {
      subscriptionTier: subscription.tier,
      subscriptionExpiry: subscription.expiresAt,
    });

    return newSubscription;
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    const result = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.isActive, true)))
      .limit(1);
    return result[0];
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const result = await db.update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, id))
      .returning();
    return result[0];
  }

  // Tasks
  async getTasks(category?: string, minTier?: string): Promise<Task[]> {
    const conditions = [eq(tasks.isActive, true)];
    
    if (category) {
      conditions.push(eq(tasks.category, category as any));
    }
    
    return await db.select().from(tasks).where(and(...conditions));
  }

  async getOrientationTasks(): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(eq(tasks.isActive, true), eq(tasks.isOrientation, true)));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values({
      ...task,
      isActive: task.isActive ?? true,
      isOrientation: task.isOrientation ?? false,
      url: task.url ?? null,
      minDuration: task.minDuration ?? 150,
    }).returning();
    return result[0];
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // User Tasks
  async getUserTasksCountToday(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(userTasks)
      .where(and(
        eq(userTasks.userId, userId),
        gte(userTasks.startedAt, today)
      ));
    
    return result[0]?.count || 0;
  }

  async createUserTask(userTask: InsertUserTask & { userId: number }): Promise<UserTask> {
    const result = await db.insert(userTasks).values({
      ...userTask,
      status: userTask.status ?? 'pending',
      startedAt: new Date(),
      completedAt: null,
      approvedAt: null,
      rejectionReason: null,
      metadata: null,
    }).returning();
    return result[0];
  }

  async getUserTasks(userId: number): Promise<UserTask[]> {
    return await db.select().from(userTasks)
      .where(eq(userTasks.userId, userId))
      .orderBy(desc(userTasks.startedAt));
  }

  async updateUserTask(id: number, updates: Partial<UserTask>): Promise<UserTask | undefined> {
    const result = await db.update(userTasks)
      .set(updates)
      .where(eq(userTasks.id, id))
      .returning();
    return result[0];
  }

  async getPendingTasks(): Promise<(UserTask & { user: User; task: Task })[]> {
    const result = await db.select({
      userTask: userTasks,
      user: users,
      task: tasks
    })
    .from(userTasks)
    .innerJoin(users, eq(userTasks.userId, users.id))
    .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
    .where(eq(userTasks.status, 'pending'));

    return result.map(row => ({
      ...row.userTask,
      user: row.user,
      task: row.task
    }));
  }

  // Wallet
  async getWallet(userId: number): Promise<Wallet | undefined> {
    const result = await db.select().from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    return result[0];
  }

  async createWallet(userId: number): Promise<Wallet> {
    const result = await db.insert(wallets).values({
      userId,
      availableBalance: "0",
      pendingBalance: "0",
      totalEarnings: "0",
      totalWithdrawn: "0",
    }).returning();
    return result[0];
  }

  async updateWallet(userId: number, updates: Partial<Wallet>): Promise<Wallet | undefined> {
    const result = await db.update(wallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wallets.userId, userId))
      .returning();
    return result[0];
  }

  // Transactions
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // Withdrawals
  async createWithdrawal(withdrawal: InsertWithdrawal & { userId: number }): Promise<Withdrawal> {
    const result = await db.insert(withdrawals).values({
      ...withdrawal,
      paymentMethodId: withdrawal.paymentMethodId ?? null,
      status: withdrawal.status ?? 'pending',
      processedAt: null,
      adminNotes: null,
    }).returning();
    return result[0];
  }

  async getWithdrawals(userId?: number): Promise<Withdrawal[]> {
    if (userId) {
      return await db.select().from(withdrawals)
        .where(eq(withdrawals.userId, userId))
        .orderBy(desc(withdrawals.createdAt));
    }
    return await db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt));
  }

  async updateWithdrawal(id: number, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
    const updateData = { ...updates };
    if (updates.status && updates.status !== 'pending') {
      updateData.processedAt = new Date();
    }
    
    const result = await db.update(withdrawals)
      .set(updateData)
      .where(eq(withdrawals.id, id))
      .returning();
    return result[0];
  }

  // Notifications
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Admin
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(): Promise<{ totalUsers: number; activeSubscriptions: number; totalEarnings: string; totalTasks: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [subCount] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.isActive, true));
    const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(userTasks);
    const [earningsSum] = await db.select({ sum: sql<string>`coalesce(sum(cast(total_earnings as decimal)), 0)` }).from(wallets);

    return {
      totalUsers: userCount.count,
      activeSubscriptions: subCount.count,
      totalEarnings: earningsSum.sum || "0",
      totalTasks: taskCount.count
    };
  }

  // Orders
  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values({
      ...order,
      status: order.status ?? 'pending',
      currency: order.currency ?? 'USD',
      payerId: order.payerId ?? null,
      payerEmail: order.payerEmail ?? null,
      metadata: order.metadata ?? null,
    }).returning();
    return result[0];
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders)
      .where(eq(orders.orderId, orderId))
      .limit(1);
    return result[0];
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const result = await db.update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  // Payment Methods
  async createPaymentMethod(paymentMethod: InsertPaymentMethod & { userId: number }): Promise<PaymentMethod> {
    const result = await db.insert(paymentMethods).values({
      ...paymentMethod,
      type: paymentMethod.type ?? 'paypal',
      isPrimary: paymentMethod.isPrimary ?? false,
      isActive: paymentMethod.isActive ?? true,
    }).returning();
    return result[0];
  }

  async getUserPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)))
      .orderBy(desc(paymentMethods.isPrimary));
  }

  async updatePaymentMethod(id: number, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const result = await db.update(paymentMethods)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    return result[0];
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const result = await db.update(paymentMethods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setPrimaryPaymentMethod(userId: number, methodId: number): Promise<boolean> {
    // First, set all user's methods to non-primary
    await db.update(paymentMethods)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(paymentMethods.userId, userId));

    // Then set the selected method as primary
    const result = await db.update(paymentMethods)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(paymentMethods.id, methodId));
    
    return (result.rowCount ?? 0) > 0;
  }
}