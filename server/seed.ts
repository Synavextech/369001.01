import { db } from "./db";
import { users, tasks, wallets, notifications } from "@shared/schema";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

async function createIndexes() {
  console.log("Creating database indexes...");
  
  try {
    // User indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier)`);
    
    // Task indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_orientation ON tasks(is_orientation)`);
    
    // User tasks indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON user_tasks(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_tasks_started_at ON user_tasks(started_at)`);
    
    // Transaction indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)`);
    
    // Wallet indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)`);
    
    // Subscription indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active)`);
    
    // Withdrawal indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)`);
    
    // Notification indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`);
    
    console.log("✅ Database indexes created successfully");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    throw error;
  }
}

async function seedAdminUser() {
  console.log("Creating admin user...");
  
  const adminEmail = process.env.ADMIN_EMAIL || "adm01@promoG.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Menjo93458s";
  
  try {
    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(sql`email = ${adminEmail}`).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log("✅ Admin user already exists");
      return existingAdmin[0];
    }
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const [adminUser] = await db.insert(users).values({
      name: "System Administrator",
      email: adminEmail,
      password: hashedPassword,
      gender: "geek",
      role: "admin",
      approvalStatus: "approved",
      subscriptionTier: "vip",
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      orientationStatus: {
        main: { completedTasks: [], isCompleted: true },
        social: { completedTasks: [], isCompleted: true },
        surveys: { completedTasks: [], isCompleted: true },
        testing: { completedTasks: [], isCompleted: true },
        ai: { completedTasks: [], isCompleted: true },
        overallCompleted: true
      }
    }).returning();
    
    // Create admin wallet
    await db.insert(wallets).values({
      userId: adminUser.id,
      availableBalance: "1000.00",
      pendingBalance: "0.00",
      totalEarnings: "1000.00",
      totalWithdrawn: "0.00"
    });
    
    console.log("✅ Admin user created successfully");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    
    return adminUser;
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    throw error;
  }
}

async function seedOrientationTasks() {
  console.log("Creating orientation tasks...");
  
  const orientationTasks = [
    // Main category tasks
    {
      title: "Welcome to ProMo-G",
      description: "Learn about our platform and how to earn money with every interaction",
      category: "main" as const,
      url: "https://promo-g.com/welcome",
      reward: "5.00",
      minTier: "member" as const,
      minDuration: 180,
      isOrientation: true
    },
    {
      title: "Platform Navigation",
      description: "Explore the dashboard and understand the main features",
      category: "main" as const,
      url: "https://promo-g.com/navigation",
      reward: "5.00",
      minTier: "member" as const,
      minDuration: 150,
      isOrientation: true
    },
    
    // Social media tasks
    {
      title: "Social Media Engagement Basics",
      description: "Learn how to effectively engage with social media content",
      category: "social" as const,
      url: "https://facebook.com/promog",
      reward: "7.50",
      minTier: "member" as const,
      minDuration: 200,
      isOrientation: true
    },
    {
      title: "Content Sharing Guidelines",
      description: "Understand best practices for sharing and promoting content",
      category: "social" as const,
      url: "https://twitter.com/promog",
      reward: "7.50",
      minTier: "member" as const,
      minDuration: 180,
      isOrientation: true
    },
    
    // Survey tasks
    {
      title: "Market Research Introduction",
      description: "Learn how to participate in surveys and polls effectively",
      category: "surveys" as const,
      url: "https://surveys.promog.com/intro",
      reward: "6.00",
      minTier: "member" as const,
      minDuration: 240,
      isOrientation: true
    },
    {
      title: "Survey Best Practices",
      description: "Tips for providing quality responses in market research",
      category: "surveys" as const,
      url: "https://surveys.promog.com/best-practices",
      reward: "6.00",
      minTier: "member" as const,
      minDuration: 200,
      isOrientation: true
    },
    
    // Testing tasks
    {
      title: "App Testing Fundamentals",
      description: "Introduction to mobile app testing and bug reporting",
      category: "testing" as const,
      url: "https://testing.promog.com/mobile-intro",
      reward: "8.00",
      minTier: "member" as const,
      minDuration: 300,
      isOrientation: true
    },
    {
      title: "Website Testing Guide",
      description: "Learn how to test websites and report usability issues",
      category: "testing" as const,
      url: "https://testing.promog.com/web-intro",
      reward: "8.00",
      minTier: "member" as const,
      minDuration: 280,
      isOrientation: true
    },
    
    // AI training tasks
    {
      title: "AI Training Basics",
      description: "Introduction to helping train AI models through data labeling",
      category: "ai" as const,
      url: "https://ai.promog.com/training-intro",
      reward: "10.00",
      minTier: "member" as const,
      minDuration: 360,
      isOrientation: true
    },
    {
      title: "Data Quality Guidelines",
      description: "Learn how to provide high-quality training data for AI systems",
      category: "ai" as const,
      url: "https://ai.promog.com/quality-guidelines",
      reward: "10.00",
      minTier: "member" as const,
      minDuration: 320,
      isOrientation: true
    }
  ];
  
  try {
    // Check if orientation tasks already exist
    const existingTasks = await db.select().from(tasks).where(sql`is_orientation = true`);
    
    if (existingTasks.length > 0) {
      console.log("✅ Orientation tasks already exist");
      return;
    }
    
    await db.insert(tasks).values(orientationTasks);
    console.log("✅ Orientation tasks created successfully");
  } catch (error) {
    console.error("❌ Error creating orientation tasks:", error);
    throw error;
  }
}

async function seedRegularTasks() {
  console.log("Creating regular tasks...");
  
  const regularTasks = [
    {
      title: "Social Media Post Engagement",
      description: "Like, share, and comment on sponsored social media posts",
      category: "social" as const,
      url: "https://facebook.com/sponsored-post-1",
      reward: "12.50",
      minTier: "silver" as const,
      minDuration: 300,
      isOrientation: false
    },
    {
      title: "Mobile App Beta Testing",
      description: "Test new mobile app features and report bugs",
      category: "testing" as const,
      url: "https://testflight.apple.com/beta-app-1",
      reward: "25.00",
      minTier: "bronze" as const,
      minDuration: 600,
      isOrientation: false
    },
    {
      title: "AI Image Labeling",
      description: "Help train AI models by labeling images accurately",
      category: "ai" as const,
      url: "https://ai.promog.com/image-labeling",
      reward: "30.00",
      minTier: "diamond" as const,
      minDuration: 900,
      isOrientation: false
    },
    {
      title: "Consumer Survey Participation",
      description: "Complete detailed market research surveys",
      category: "surveys" as const,
      url: "https://surveys.promog.com/consumer-research",
      reward: "15.00",
      minTier: "silver" as const,
      minDuration: 450,
      isOrientation: false
    }
  ];
  
  try {
    await db.insert(tasks).values(regularTasks);
    console.log("✅ Regular tasks created successfully");
  } catch (error) {
    console.error("❌ Error creating regular tasks:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting database seeding...");
  
  try {
    await createIndexes();
    const adminUser = await seedAdminUser();
    await seedOrientationTasks();
    await seedRegularTasks();
    
    // Create welcome notification for admin
    await db.insert(notifications).values({
      userId: adminUser.id,
      title: "Welcome to ProMo-G Admin",
      message: "Your admin account has been set up successfully. You can now manage users, tasks, and system settings.",
      type: "system",
      isRead: false,
      metadata: { setupComplete: true }
    });
    
    console.log("✅ Database seeding completed successfully!");
    console.log("🎉 Your ProMo-G platform is ready to use!");
    
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as seedDatabase };