import crypto from 'crypto';

export function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function hashPassword(password: string): string {
  // In production, use bcrypt or similar secure hashing
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function validatePhone(phone: string): boolean {
  // Basic Kenyan phone number validation
  const phoneRegex = /^(\+254|254|0)?[7-9]\d{8}$/;
  return phoneRegex.test(phone);
}

export function formatPhone(phone: string): string {
  // Normalize phone number to +254 format
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    // Already in correct format
  } else if (cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  
  return '+' + cleaned;
}

export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN_${timestamp}_${random}`.toUpperCase();
}

export function calculateSubscriptionExpiry(tier: string): Date {
  // All subscriptions last 30 days
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

export function getTierLimits(tier: string): { dailyTasks: number; categories: string[] } {
  const tierConfig = {
    member: { dailyTasks: 2, categories: ['main'] },
    silver: { dailyTasks: 5, categories: ['main', 'social'] },
    bronze: { dailyTasks: 10, categories: ['main', 'social'] },
    diamond: { dailyTasks: 15, categories: ['main', 'social', 'surveys'] },
    gold: { dailyTasks: 20, categories: ['main', 'social', 'surveys', 'testing'] },
    vip: { dailyTasks: 25, categories: ['main', 'social', 'surveys', 'testing', 'ai'] },
  };
  
  return tierConfig[tier as keyof typeof tierConfig] || tierConfig.member;
}

export function canAccessTask(userTier: string, taskTier: string): boolean {
  const tierOrder = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip'];
  const userTierIndex = tierOrder.indexOf(userTier);
  const taskTierIndex = tierOrder.indexOf(taskTier);
  
  return userTierIndex >= taskTierIndex;
}

export function calculateReferralBonus(subscriptionAmount: number): number {
  // 10% referral bonus
  return subscriptionAmount * 0.1;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  // Basic input sanitization
  return input.trim().replace(/[<>]/g, '');
}

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createAuditLog(action: string, userId: number, metadata?: any): any {
  return {
    action,
    userId,
    timestamp: new Date(),
    ip: 'system', // In real implementation, get from request
    userAgent: 'system',
    metadata: metadata || {},
  };
}
