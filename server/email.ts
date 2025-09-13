class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@promo-g.com';
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.apiKey) {
      console.log('Email would be sent:', { to, subject });
      return true; // Mock success for development
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ProMo-G, ${name}!</h2>
        <p>Thank you for joining our digital marketing platform.</p>
        <p>Your account has been created successfully. Please complete the orientation tasks to get started earning.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Next Steps:</h3>
          <ol>
            <li>Complete orientation tasks (2 tasks per category)</li>
            <li>Choose your subscription plan</li>
            <li>Start earning with premium tasks</li>
          </ol>
        </div>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The ProMo-G Team</p>
      </div>
    `;

    return await this.sendEmail(to, 'Welcome to ProMo-G!', html);
  }

  async sendOrientationCompleteEmail(to: string, name: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Congratulations, ${name}!</h2>
        <p>You've successfully completed the orientation program.</p>
        <p>Now it's time to choose your subscription plan and start earning with premium tasks.</p>
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Ready to earn more?</h3>
          <p>Choose from our subscription tiers to unlock higher-paying tasks and increase your daily earning limits.</p>
        </div>
        <p>Login to your account to select your plan and start earning!</p>
        <p>Best regards,<br>The ProMo-G Team</p>
      </div>
    `;

    return await this.sendEmail(to, 'Orientation Complete - Choose Your Plan!', html);
  }
}

export const emailService = new EmailService();