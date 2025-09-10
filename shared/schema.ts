import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const genderEnum = pgEnum('gender', ['male', 'female', 'geek']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip']);
export const taskCategoryEnum = pgEnum('task_category', ['main', 'social', 'surveys', 'testing', 'ai']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'approved', 'rejected']);
export const transactionTypeEnum = pgEnum('transaction_type', ['earning', 'withdrawal', 'referral', 'subscription']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed']);
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
export const paymentMethodEnum = pgEnum('payment_method', ['paypal']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'completed', 'failed', 'refunded']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 16 }), // VARCHAR(16) for E.164 format (max 15 digits + '+')
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  gender: genderEnum("gender").notNull(),
  role: roleEnum("role").notNull().default('user'),
  subscriptionTier: subscriptionTierEnum("subscription_tier"),
  subscriptionExpiry: timestamp("subscription_expiry"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  isActive: boolean("is_active").notNull().default(true),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default('pending'),
  orientationStatus: json("orientation_status").notNull().default('{"main":{"completedTasks":[],"isCompleted":false},"social":{"completedTasks":[],"isCompleted":false},"surveys":{"completedTasks":[],"isCompleted":false},"testing":{"completedTasks":[],"isCompleted":false},"ai":{"completedTasks":[],"isCompleted":false},"overallCompleted":false}'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tier: subscriptionTierEnum("tier").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default('paypal'),
  paymentReference: text("payment_reference"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: taskCategoryEnum("category").notNull(),
  url: text("url"),
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  minTier: subscriptionTierEnum("min_tier").notNull(),
  minDuration: integer("min_duration").notNull().default(150), // seconds
  isActive: boolean("is_active").notNull().default(true),
  isOrientation: boolean("is_orientation").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userTasks = pgTable("user_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  status: taskStatusEnum("status").notNull().default('pending'),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  metadata: json("metadata"), // for tracking engagement time, etc.
});

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).notNull().default('0'),
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).notNull().default('0'),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).notNull().default('0'),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default('pending'),
  reference: text("reference"),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id),
  status: transactionStatusEnum("status").notNull().default('pending'),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orderId: text("order_id").notNull().unique(),
  payerId: text("payer_id"),
  payerEmail: text("payer_email"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default('USD'),
  status: orderStatusEnum("status").notNull().default('pending'),
  subscriptionTier: subscriptionTierEnum("subscription_tier").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: paymentMethodEnum("type").notNull().default('paypal'),
  email: text("email").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'task', 'payment', 'subscription', 'system'
  isRead: boolean("is_read").notNull().default(false),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  referralCode: true,
  role: true,
}).extend({
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +1234567890)").optional().or(z.literal("")),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => {
  // Enhanced password validation
  const password = data.password;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}, {
  message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  path: ["password"],
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertUserTaskSchema = createInsertSchema(userTasks).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  approvedAt: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  adminNotes: true,
  userId: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UserTask = typeof userTasks.$inferSelect;
export type InsertUserTask = z.infer<typeof insertUserTaskSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Notification = typeof notifications.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
