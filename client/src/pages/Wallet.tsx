import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Wallet, Transaction, Withdrawal, PaymentMethod } from "@shared/schema";

interface WalletData {
  availableBalance: string;
  pendingBalance: string;
  totalEarnings: string;
}

interface TransactionType extends Omit<Transaction, 'createdAt'> {
  type: 'earning' | 'withdrawal' | 'referral' | 'subscription';
  status: 'completed' | 'failed' | 'pending';
  amount: string;
  description: string | null;
  createdAt: Date;
}

interface WithdrawalType extends Omit<Withdrawal, 'createdAt'> {
  status: 'completed' | 'failed' | 'pending';
  amount: string;
  createdAt: Date;
  phoneNumber?: string;
}

interface PaymentMethodType extends PaymentMethod {
  id: number;
  email: string;
  isPrimary: boolean;
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  insertWithdrawalSchema,
  insertPaymentMethodSchema,
  type InsertWithdrawal,
  type InsertPaymentMethod,
} from "@shared/schema";
import { useState } from "react";
import { Star, Trash2, Plus } from "lucide-react";

export default function Wallet() {
  const [showWithdrawals, setShowWithdrawals] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | null
  >(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallet = { availableBalance: "0", pendingBalance: "0", totalEarnings: "0" } } = useQuery<WalletData>({
    queryKey: [`/api/users/${user?.id}/wallet`],
    enabled: !!user?.id,
  });

  const { data: transactions = [] } = useQuery<TransactionType[]>({
    queryKey: [`/api/users/${user?.id}/transactions`],
    enabled: !!user?.id,
  });

  const { data: withdrawals = [] } = useQuery<WithdrawalType[]>({
    queryKey: [`/api/withdrawals/${user?.id}`],
    enabled: !!user?.id && showWithdrawals,
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethodType[]>({
    queryKey: [`/api/users/${user?.id}/payment-methods`],
    enabled: !!user?.id,
  });

  interface WithdrawalFormData extends InsertWithdrawal {
    paymentMethodId?: number;
  }

  const withdrawForm = useForm<WithdrawalFormData>({
    resolver: zodResolver(
      insertWithdrawalSchema.extend({
        paymentMethodId: z.number().optional().nullable(),
      })
    ),
    defaultValues: {
      amount: "0",
      paymentMethodId: undefined,
    },
  });

  const paymentMethodForm = useForm<InsertPaymentMethod>({
    resolver: zodResolver(insertPaymentMethodSchema),
    defaultValues: {
      type: "paypal",
      email: "",
      isPrimary: false,
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (
      data: InsertWithdrawal & { paymentMethodId?: number },
    ) => {
      const response = await apiRequest("POST", "/api/withdrawals", {
        ...data,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal request submitted",
        description: "Your request is being reviewed by our admin team.",
      });
      withdrawForm.reset();
      queryClient.invalidateQueries({
        queryKey: [`/api/withdrawals/${user?.id}`],
      });
    },
    onError: () => {
      toast({
        title: "Withdrawal failed",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async (data: InsertPaymentMethod) => {
      const response = await apiRequest("POST", "/api/payment-methods", {
        ...data,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method added",
        description: "Your PayPal account has been added successfully.",
      });
      paymentMethodForm.reset();
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user?.id}/payment-methods`],
      });
    },
    onError: () => {
      toast({
        title: "Failed to add payment method",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (methodId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/payment-methods/${methodId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method removed",
        description: "The payment method has been removed successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user?.id}/payment-methods`],
      });
    },
  });

  const setPrimaryPaymentMethodMutation = useMutation({
    mutationFn: async (methodId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/users/${user?.id}/payment-methods/${methodId}/set-primary`,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Primary payment method updated",
        description: "Your primary payment method has been updated.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user?.id}/payment-methods`],
      });
    },
  });

  const onWithdraw = (data: WithdrawalFormData) => {
    const amount = parseFloat(data.amount);
    const available = parseFloat(wallet?.availableBalance || "0");

    if (amount < 10) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is $10",
        variant: "destructive",
      });
      return;
    }

    if (amount > available) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough available balance",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethodId) {
      toast({
        title: "No payment method selected",
        description: "Please select a PayPal account for withdrawal",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate({
      ...data,
      paymentMethodId: selectedPaymentMethodId,
    });
  };

  const onAddPaymentMethod = (data: InsertPaymentMethod) => {
    addPaymentMethodMutation.mutate(data);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earning":
        return "💰";
      case "withdrawal":
        return "📤";
      case "referral":
        return "👥";
      case "subscription":
        return "💳";
      default:
        return "💸";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">💳 Wallet</h1>
        </div>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-success to-green-600 text-success-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Current Balance</h3>
                <div className="text-2xl">💰</div>
              </div>
              <div className="text-3xl font-bold mb-2">
                ${parseFloat(wallet?.availableBalance || "0").toLocaleString()}
              </div>
              <p className="text-sm opacity-90">Available💸</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning to-yellow-600 text-warning-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Pending 💸</h3>
                <div className="text-2xl">⏳</div>
              </div>
              <div className="text-3xl font-bold mb-2">
                ${parseFloat(wallet?.pendingBalance || "0").toLocaleString()}
              </div>
              <p className="text-sm opacity-90">Comin Soon 🫰🏽</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 p-4 h-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📤</span>
                  <span className="font-semibold">Withdraw Funds</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={withdrawForm.handleSubmit(onWithdraw)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="amount">$</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="20"
                    step="1"
                    placeholder="Enter amount"
                    {...withdrawForm.register("amount")}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: 10$
                  </p>
                  {withdrawForm.formState.errors.amount && (
                    <p className="text-sm text-destructive">
                      {withdrawForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Select PayPal Account</Label>
                  <RadioGroup
                    value={selectedPaymentMethodId?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedPaymentMethodId(parseInt(value))
                    }
                  >
                    {paymentMethods?.length > 0 ? (
                      paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <RadioGroupItem
                            value={method.id.toString()}
                            id={`method-${method.id}`}
                          />
                          <Label
                            htmlFor={`method-${method.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span>{method.email}</span>
                              {method.isPrimary && (
                                <Badge variant="secondary" className="ml-2">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No PayPal accounts added. Please add one first.
                      </p>
                    )}
                  </RadioGroup>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={withdrawMutation.isPending}
                >
                  {withdrawMutation.isPending
                    ? "Processing..."
                    : "Submit Withdrawal"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            className="p-4 h-auto"
            onClick={() => setShowWithdrawals(!showWithdrawals)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-semibold">
                {showWithdrawals ? "Hide" : "Show"} Withdrawal History
              </span>
            </div>
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="p-4 h-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  <span className="font-semibold">Manage PayPal Accounts</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>PayPal Accounts</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Existing Payment Methods */}
                <div className="space-y-2">
                  {paymentMethods?.length > 0 ? (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">💰</span>
                          <div>
                            <p className="font-medium">{method.email}</p>
                            {method.isPrimary && (
                              <Badge variant="secondary" className="mt-1">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isPrimary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setPrimaryPaymentMethodMutation.mutate(
                                  method.id,
                                )
                              }
                              disabled={
                                setPrimaryPaymentMethodMutation.isPending
                              }
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deletePaymentMethodMutation.mutate(method.id)
                            }
                            disabled={deletePaymentMethodMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No PayPal accounts added yet
                    </p>
                  )}
                </div>

                {/* Add New Payment Method Form */}
                <form
                  onSubmit={paymentMethodForm.handleSubmit(onAddPaymentMethod)}
                  className="space-y-4 border-t pt-4"
                >
                  <h4 className="font-medium">Add New PayPal Account</h4>
                  <div>
                    <Label htmlFor="paypal-email">PayPal Email</Label>
                    <Input
                      id="paypal-email"
                      type="email"
                      placeholder="your-email@example.com"
                      {...paymentMethodForm.register("email")}
                    />
                    {paymentMethodForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {paymentMethodForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="make-primary"
                      {...paymentMethodForm.register("isPrimary")}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="make-primary" className="text-sm">
                      Set as primary payment method
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={addPaymentMethodMutation.isPending}
                  >
                    {addPaymentMethodMutation.isPending ? (
                      "Adding..."
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add PayPal Account
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Withdrawal History */}
        {showWithdrawals && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>💰 History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {withdrawals?.length > 0 ? (
                  withdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          ${parseFloat(withdrawal.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.phoneNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {withdrawal.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    No 💰 history yet, compelte some tasks and come back!!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent 💴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions?.length > 0 ? (
                transactions.slice(0, 10).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {transaction.type.replace("_", " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === "withdrawal"
                            ? "text-destructive"
                            : "text-success"
                        }`}
                      >
                        {transaction.type === "withdrawal" ? "-" : "+"}$
                        {parseFloat(transaction.amount).toLocaleString()}
                      </p>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">
                  No 🤑 yet, Go complete some tasks and come back!!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
