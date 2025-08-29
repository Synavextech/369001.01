import React, { useEffect, useRef, useState } from "react";
import { loadScript } from "@paypal/paypal-js";

interface PayPalCheckoutButtonProps {
  amount: string;
  currency: string;
  intent: string;
  tier?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

export default function PayPalCheckoutButton({
  amount,
  currency,
  intent,
  tier,
  onSuccess,
  onError,
  onCancel
}: PayPalCheckoutButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePayPal = async () => {
      try {
        // Get client token from server
        const tokenResponse = await fetch("/api/paypal/setup", {
          credentials: "include"
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`Failed to fetch client token: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }
        
        const { clientToken } = await tokenResponse.json();
        console.log("Client token fetched successfully");

        // Load PayPal SDK
        const paypal = await loadScript({
          clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "YOUR_PAYPAL_CLIENT_ID",
          components: "buttons",
          dataClientToken: clientToken,
          currency: currency,
          "data-disable-funding": "card,credit,venmo,sepa,bancontact,eps,giropay,ideal,mybank,p24,sofort",
          commit: true
        } as any);
        
        console.log("PayPal SDK loaded successfully");

        if (!paypal || !paypal.Buttons) {
          throw new Error("Failed to load PayPal SDK - Buttons component not available");
        }

        // Create PayPal buttons
        const buttons = paypal.Buttons({
          createOrder: async () => {
            const orderPayload = {
              amount: amount,
              currency: currency,
              intent: intent,
              ...(tier && { tier: tier }),
            };
            
            const response = await fetch("/api/paypal/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(orderPayload),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error("Failed to create PayPal order:", response.status, response.statusText, errorData);
              throw new Error(`Failed to create PayPal order: ${response.status} ${response.statusText}`);
            }
            
            const orderData = await response.json();
            console.log("PayPal order created:", orderData);
            return orderData.id;
          },
          onApprove: async (data) => {
            try {
              console.log("PayPal payment approved:", data);
              // For standalone redirect approach, we redirect to our success endpoint
              // which will handle the capture and redirect to the subscription success page
              window.location.href = `/api/paypal/success?token=${data.orderID}`;
            } catch (error) {
              console.error("Payment processing failed:", error);
              if (onError) {
                onError(error);
              }
              alert("Payment processing failed. Please try again.");
            }
          },
          onError: (err) => {
            console.error("PayPal Checkout onError", err);
            setError("Failed to initialize PayPal. Please try again.");
            if (onError) {
              onError(err);
            }
          },
          onCancel: () => {
            console.log("PayPal Checkout onCancel");
            if (onCancel) {
              onCancel();
            }
          },
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            tagline: false
          },
          fundingSource: 'paypal'
        });

        // Render the buttons
        if (paypalRef.current) {
          console.log("Rendering PayPal buttons");
          buttons.render(paypalRef.current).catch((error) => {
            console.error("Failed to render PayPal buttons:", error);
            setError("Failed to render PayPal buttons. Please try again.");
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to initialize PayPal:", error);
        setError("Failed to initialize PayPal. Please try again.");
        setLoading(false);
      }
    };

    initializePayPal();
  }, [amount, currency, intent, tier, onSuccess, onError, onCancel]);

  if (loading) {
    return <div className="text-center py-4">Loading PayPal checkout...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return <div ref={paypalRef}></div>;
}