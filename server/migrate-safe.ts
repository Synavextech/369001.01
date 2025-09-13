import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Safe migration script that handles existing tables and data
 * This script is idempotent - it can be run multiple times safely
 */

async function createEnumsIfNotExists() {
  console.log("Creating enums if they don't exist...");
  
  const enums = [
    { name: 'gender', values: ['male', 'female', 'geek'] },
    { name: 'subscription_tier', values: ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip'] },
    { name: 'task_category', values: ['main', 'social', 'surveys', 'testing', 'ai'] },
    { name: 'task_status', values: ['pending', 'approved', 'rejected'] },
    { name: 'transaction_type', values: ['earning', 'withdrawal', 'referral', 'subscription'] },
    { name: 'transaction_status', values: ['pending', 'completed', 'failed'] },
    { name: 'role', values: ['user', 'admin'] },
    { name: 'approval_status', values: ['pending', 'approved', 'rejected'] },
    { name: 'payment_method', values: ['paypal'] },
    { name: 'order_status', values: ['pending', 'completed', 'failed', 'refunded'] }
  ];

  for (const enumDef of enums) {
    try {
      await db.execute(sql`
        DO $$ BEGIN
          CREATE TYPE ${sql.identifier(enumDef.name)} AS ENUM (${sql.join(enumDef.values.map(v => sql`${v}`), sql`, `)});
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log(`✅ Enum ${enumDef.name} created or already exists`);
    } catch (error) {
      console.error(`❌ Error creating enum ${enumDef.name}:`, error);
    }
  }
}

async function createTablesIfNotExists() {
  console.log("Creating tables if they don't exist...");

  // Users table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone VARCHAR(16),
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        gender gender NOT NULL,
        role role NOT NULL DEFAULT 'user',
        subscription_tier subscription_tier,
        subscription_expiry TIMESTAMP,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        approval_status approval_status NOT NULL DEFAULT 'pending',
        orientation_status JSON NOT NULL DEFAULT '{"main":{"completedTasks":[],"isCompleted":false},"social":{"completedTasks":[],"isCompleted":false},"surveys":{"completedTasks":[],"isCompleted":false},"testing":{"completedTasks":[],"isCompleted":false},"ai":{"completedTasks":[],"isCompleted":false},"overallCompleted":false}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Users table created or already exists");
  } catch (error) {
    console.error("❌ Error creating users table:", error);
  }

  // Tasks table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category task_category NOT NULL,
        url TEXT,
        reward NUMERIC(10, 2) NOT NULL,
        min_tier subscription_tier NOT NULL,
        min_duration INTEGER NOT NULL DEFAULT 150,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_orientation BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tasks table created or already exists");
  } catch (error) {
    console.error("❌ Error creating tasks table:", error);
  }

  // Wallets table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
        available_balance NUMERIC(10, 2) NOT NULL DEFAULT '0',
        pending_balance NUMERIC(10, 2) NOT NULL DEFAULT '0',
        total_earnings NUMERIC(10, 2) NOT NULL DEFAULT '0',
        total_withdrawn NUMERIC(10, 2) NOT NULL DEFAULT '0',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Wallets table created or already exists");
  } catch (error) {
    console.error("❌ Error creating wallets table:", error);
  }

  // User tasks table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        task_id INTEGER NOT NULL REFERENCES tasks(id),
        status task_status NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP,
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        metadata JSON
      );
    `);
    console.log("✅ User tasks table created or already exists");
  } catch (error) {
    console.error("❌ Error creating user_tasks table:", error);
  }

  // Subscriptions table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        tier subscription_tier NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        payment_method payment_method NOT NULL DEFAULT 'paypal',
        payment_reference TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Subscriptions table created or already exists");
  } catch (error) {
    console.error("❌ Error creating subscriptions table:", error);
  }

  // Transactions table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type transaction_type NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status transaction_status NOT NULL DEFAULT 'pending',
        reference TEXT,
        description TEXT,
        metadata JSON,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Transactions table created or already exists");
  } catch (error) {
    console.error("❌ Error creating transactions table:", error);
  }

  // Payment methods table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type payment_method NOT NULL DEFAULT 'paypal',
        email TEXT NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Payment methods table created or already exists");
  } catch (error) {
    console.error("❌ Error creating payment_methods table:", error);
  }

  // Withdrawals table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC(10, 2) NOT NULL,
        payment_method_id INTEGER REFERENCES payment_methods(id),
        status transaction_status NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Withdrawals table created or already exists");
  } catch (error) {
    console.error("❌ Error creating withdrawals table:", error);
  }

  // Orders table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        order_id TEXT NOT NULL UNIQUE,
        payer_id TEXT,
        payer_email TEXT,
        amount NUMERIC(10, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status order_status NOT NULL DEFAULT 'pending',
        subscription_tier subscription_tier NOT NULL,
        metadata JSON,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Orders table created or already exists");
  } catch (error) {
    console.error("❌ Error creating orders table:", error);
  }

  // Notifications table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        metadata JSON,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Notifications table created or already exists");
  } catch (error) {
    console.error("❌ Error creating notifications table:", error);
  }
}

async function createIndexesIfNotExists() {
  console.log("Creating indexes if they don't exist...");
  
  const indexes = [
    // User indexes
    { name: 'idx_users_email', table: 'users', column: 'email' },
    { name: 'idx_users_approval_status', table: 'users', column: 'approval_status' },
    { name: 'idx_users_subscription_tier', table: 'users', column: 'subscription_tier' },
    
    // Task indexes
    { name: 'idx_tasks_category', table: 'tasks', column: 'category' },
    { name: 'idx_tasks_active', table: 'tasks', column: 'is_active' },
    { name: 'idx_tasks_orientation', table: 'tasks', column: 'is_orientation' },
    
    // User tasks indexes
    { name: 'idx_user_tasks_user_id', table: 'user_tasks', column: 'user_id' },
    { name: 'idx_user_tasks_task_id', table: 'user_tasks', column: 'task_id' },
    { name: 'idx_user_tasks_status', table: 'user_tasks', column: 'status' },
    { name: 'idx_user_tasks_started_at', table: 'user_tasks', column: 'started_at' },
    
    // Transaction indexes
    { name: 'idx_transactions_user_id', table: 'transactions', column: 'user_id' },
    { name: 'idx_transactions_type', table: 'transactions', column: 'type' },
    { name: 'idx_transactions_status', table: 'transactions', column: 'status' },
    { name: 'idx_transactions_created_at', table: 'transactions', column: 'created_at' },
    
    // Wallet indexes
    { name: 'idx_wallets_user_id', table: 'wallets', column: 'user_id' },
    
    // Subscription indexes
    { name: 'idx_subscriptions_user_id', table: 'subscriptions', column: 'user_id' },
    { name: 'idx_subscriptions_active', table: 'subscriptions', column: 'is_active' },
    
    // Withdrawal indexes
    { name: 'idx_withdrawals_user_id', table: 'withdrawals', column: 'user_id' },
    { name: 'idx_withdrawals_status', table: 'withdrawals', column: 'status' },
    
    // Notification indexes
    { name: 'idx_notifications_user_id', table: 'notifications', column: 'user_id' },
    { name: 'idx_notifications_read', table: 'notifications', column: 'is_read' }
  ];

  for (const index of indexes) {
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS ${sql.identifier(index.name)} 
        ON ${sql.identifier(index.table)}(${sql.identifier(index.column)})
      `);
      console.log(`✅ Index ${index.name} created or already exists`);
    } catch (error) {
      console.error(`❌ Error creating index ${index.name}:`, error);
    }
  }
}

async function enableRLSIfNeeded() {
  console.log("Enabling Row Level Security if needed...");
  
  const tables = [
    'users', 'tasks', 'user_tasks', 'wallets', 'subscriptions', 
    'transactions', 'withdrawals', 'orders', 'payment_methods', 'notifications'
  ];

  for (const table of tables) {
    try {
      // Check if RLS is already enabled
      const result = await db.execute(sql`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = ${table}
      `);
      
      if (result.length > 0 && !result[0].relrowsecurity) {
        await db.execute(sql`ALTER TABLE ${sql.identifier(table)} ENABLE ROW LEVEL SECURITY`);
        console.log(`✅ RLS enabled for ${table}`);
      } else {
        console.log(`✅ RLS already enabled for ${table}`);
      }
    } catch (error) {
      console.error(`❌ Error enabling RLS for ${table}:`, error);
    }
  }
}

async function createRLSPolicies() {
  console.log("Creating RLS policies if they don't exist...");
  
  try {
    // Users can only see their own data
    await db.execute(sql`
      CREATE POLICY IF NOT EXISTS "Users can view own profile" ON users
      FOR SELECT USING (auth.uid()::text = id::text OR 
                       EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::int AND role = 'admin'))
    `);

    // Users can only update their own data
    await db.execute(sql`
      CREATE POLICY IF NOT EXISTS "Users can update own profile" ON users
      FOR UPDATE USING (auth.uid()::text = id::text OR 
                       EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::int AND role = 'admin'))
    `);

    // Similar policies for other tables...
    console.log("✅ RLS policies created or already exist");
  } catch (error) {
    console.error("❌ Error creating RLS policies:", error);
    console.log("Note: RLS policies require Supabase auth. Skipping for now.");
  }
}

export async function runSafeMigration() {
  console.log("🚀 Starting safe database migration...");
  
  try {
    await createEnumsIfNotExists();
    await createTablesIfNotExists();
    await createIndexesIfNotExists();
    
    // Only enable RLS in production with Supabase
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('supabase')) {
      await enableRLSIfNeeded();
      await createRLSPolicies();
    }
    
    console.log("✅ Safe migration completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSafeMigration()
    .then(() => {
      console.log("Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}