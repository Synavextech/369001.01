import { Request, Response } from "express";
import { storage } from "./storage";
import { AppError, sendSuccess } from "./middleware";
import crypto from "crypto";

// PayPal webhook event types
interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: string;
  resource: any;
  summary: string;
}

// Verify PayPal webhook signature
const verifyPayPalWebhook = (req: Request): boolean => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const paypalSignature = req.headers['paypal-transmission-sig'] as string;
  const paypalCertId = req.headers['paypal-cert-id'] as string;
  const paypalTransmissionId = req.headers['paypal-transmission-id'] as string;
  const paypalTransmissionTime = req.headers['paypal-transmission-time'] as string;

  if (!webhookId || !paypalSignature || !paypalCertId || !paypalTransmissionId || !paypalTransmissionTime) {
    console.error('Missing PayPal webhook headers');
    return false;
  }

  // In production, implement proper PayPal webhook signature verification
  // For now, we'll do basic validation
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PAYPAL_WEBHOOK_SECRET || '')
    .update(JSON.stringify(req.body))
    .digest('base64');

  return paypalSignature === expectedSignature;
};

// Handle PayPal webhook events
export const handlePayPalWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    if (!verifyPayPalWebhook(req)) {
      throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    const event: PayPalWebhookEvent = req.body;
    console.log(`Received PayPal webhook: ${event.event_type}`);

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event);
        break;
      
      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentCaptureDenied(event);
        break;
      
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentCaptureRefunded(event);
        break;
      
      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(event);
        break;
      
      case 'CHECKOUT.ORDER.COMPLETED':
        await handleOrderCompleted(event);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${event.event_type}`);
    }

    sendSuccess(res, { received: true }, 'Webhook processed successfully');
  } catch (error) {
    console.error('PayPal webhook error:', error);
    throw new AppError('Webhook processing failed', 500, 'WEBHOOK_ERROR');
  }
};

// Handle successful payment capture
const handlePaymentCaptureCompleted = async (event: PayPalWebhookEvent) => {
  const capture = event.resource;
  const orderId = capture.supplementary_data?.related_ids?.order_id;
  
  if (!orderId) {
    console.error('No order ID found in payment capture event');
    return;
  }

  try {
    // Find the order in our database
    const order = await storage.getOrder(orderId);
    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }

    // Update order status
    await storage.updateOrder(order.id, {
      status: 'completed',
      payerId: capture.payer?.payer_id,
      payerEmail: capture.payer?.email_address,
      metadata: {
        ...(order.metadata as object || {}),
        captureId: capture.id,
        captureTime: capture.create_time,
        captureAmount: capture.amount
      }
    });

    // Create or update subscription
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month subscription

    await storage.createSubscription({
      userId: order.userId,
      tier: order.subscriptionTier,
      amount: order.amount,
      paymentMethod: 'paypal',
      paymentReference: capture.id,
      isActive: true,
      expiresAt: expiryDate
    });

    // Update user subscription
    await storage.updateUser(order.userId, {
      subscriptionTier: order.subscriptionTier,
      subscriptionExpiry: expiryDate
    });

    // Create success notification
    await storage.createNotification({
      userId: order.userId,
      title: 'Payment Successful',
      message: `Your ${order.subscriptionTier} subscription has been activated successfully.`,
      type: 'payment',
      isRead: false,
      metadata: {
        orderId: order.orderId,
        captureId: capture.id,
        amount: capture.amount.value
      }
    });

    console.log(`Payment completed for order ${orderId}`);
  } catch (error) {
    console.error(`Error processing payment completion for order ${orderId}:`, error);
    
    // Create error notification for user
    try {
      const order = await storage.getOrder(orderId);
      if (order) {
        await storage.createNotification({
          userId: order.userId,
          title: 'Payment Processing Issue',
          message: 'There was an issue processing your payment. Please contact support.',
          type: 'payment',
          isRead: false,
          metadata: {
            orderId: order.orderId,
            error: 'payment_processing_failed'
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to create error notification:', notificationError);
    }
  }
};

// Handle denied payment capture
const handlePaymentCaptureDenied = async (event: PayPalWebhookEvent) => {
  const capture = event.resource;
  const orderId = capture.supplementary_data?.related_ids?.order_id;
  
  if (!orderId) return;

  try {
    const order = await storage.getOrder(orderId);
    if (!order) return;

    // Update order status
    await storage.updateOrder(order.id, {
      status: 'failed',
      metadata: {
        ...(order.metadata as object || {}),
        failureReason: capture.status_details?.reason,
        failureTime: new Date().toISOString()
      }
    });

    // Create failure notification
    await storage.createNotification({
      userId: order.userId,
      title: 'Payment Failed',
      message: 'Your payment was declined. Please try again with a different payment method.',
      type: 'payment',
      isRead: false,
      metadata: {
        orderId: order.orderId,
        reason: capture.status_details?.reason
      }
    });

    console.log(`Payment denied for order ${orderId}`);
  } catch (error) {
    console.error(`Error processing payment denial for order ${orderId}:`, error);
  }
};

// Handle payment refund
const handlePaymentCaptureRefunded = async (event: PayPalWebhookEvent) => {
  const refund = event.resource;
  const captureId = refund.links?.find((link: any) => link.rel === 'up')?.href?.split('/').pop();
  
  if (!captureId) return;

  try {
    // Find order by capture ID in metadata
    // This would require a more sophisticated query in a real implementation
    console.log(`Payment refunded for capture ${captureId}`);
    
    // Update subscription status and create notification
    // Implementation depends on your specific business logic
  } catch (error) {
    console.error(`Error processing refund for capture ${captureId}:`, error);
  }
};

// Handle order approval
const handleOrderApproved = async (event: PayPalWebhookEvent) => {
  const order = event.resource;
  
  try {
    const dbOrder = await storage.getOrder(order.id);
    if (!dbOrder) return;

    await storage.updateOrder(dbOrder.id, {
      status: 'pending',
      metadata: {
        ...(dbOrder.metadata as object || {}),
        approvedTime: new Date().toISOString(),
        payerInfo: order.payer
      }
    });

    console.log(`Order approved: ${order.id}`);
  } catch (error) {
    console.error(`Error processing order approval for ${order.id}:`, error);
  }
};

// Handle order completion
const handleOrderCompleted = async (event: PayPalWebhookEvent) => {
  const order = event.resource;
  
  try {
    const dbOrder = await storage.getOrder(order.id);
    if (!dbOrder) return;

    await storage.updateOrder(dbOrder.id, {
      status: 'completed',
      metadata: {
        ...(dbOrder.metadata as object || {}),
        completedTime: new Date().toISOString(),
        finalStatus: order.status
      }
    });

    console.log(`Order completed: ${order.id}`);
  } catch (error) {
    console.error(`Error processing order completion for ${order.id}:`, error);
  }
};

// Payment recovery system
export const recoverFailedPayments = async () => {
  try {
    console.log('Starting payment recovery process...');
    
    // Find orders that are pending for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // This would require a custom query in your storage layer
    // const staleOrders = await storage.getStaleOrders(oneHourAgo);
    
    // For each stale order, check PayPal status and update accordingly
    // Implementation would involve calling PayPal API to check order status
    
    console.log('Payment recovery process completed');
  } catch (error) {
    console.error('Payment recovery process failed:', error);
  }
};

// Retry failed payments
export const retryFailedPayment = async (orderId: string) => {
  try {
    const order = await storage.getOrder(orderId);
    if (!order || order.status !== 'failed') {
      throw new AppError('Order not found or not in failed state', 404);
    }

    // Reset order status to pending for retry
    const currentMetadata = order.metadata as any || {};
    await storage.updateOrder(order.id, {
      status: 'pending',
      metadata: {
        ...currentMetadata,
        retryAttempt: (currentMetadata.retryAttempt || 0) + 1,
        retryTime: new Date().toISOString()
      }
    });

    // Create notification about retry
    await storage.createNotification({
      userId: order.userId,
      title: 'Payment Retry',
      message: 'We are retrying your payment. You will be notified of the result.',
      type: 'payment',
      isRead: false,
      metadata: {
        orderId: order.orderId,
        retryAttempt: (currentMetadata.retryAttempt || 0) + 1
      }
    });

    return { success: true, message: 'Payment retry initiated' };
  } catch (error) {
    console.error(`Error retrying payment for order ${orderId}:`, error);
    throw error;
  }
};