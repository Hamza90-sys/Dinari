import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CreditCard,
  Phone,
  Lock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { paymentSessionService } from "@/services/payment-session.service";
import { webhookService } from "@/services/webhook.service";
import { useAuth } from "@/hooks/use-auth";
import type { PaymentSession, DinariRequest } from "@/types/domain";
import { PAYMENT_SESSION_CONFIG, PAYMENT_METHODS, SANDBOX_DELAYS } from "@/lib/payment.constants";
import { supabase } from "@/lib/supabase";

const CheckoutPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [request, setRequest] = useState<DinariRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"D17" | "bank_card">("D17");
  const [error, setError] = useState<string | null>(null);

  const sessionId = params.get("session");

  // Fetch session and request data
  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!sessionId) {
          setError("No payment session found. Please create a new one.");
          return;
        }

        // Fetch payment session
        const paymentSession = await paymentSessionService.getSession(sessionId);
        if (!paymentSession) {
          setError("Payment session not found or has expired.");
          return;
        }

        // Verify session is still valid
        const { valid, reason } = await paymentSessionService.verifySession(sessionId);
        if (!valid) {
          setError(`Payment session is invalid: ${reason}`);
          return;
        }

        // Fetch request details
        const { data: requestData, error: requestError } = await supabase
          .from("requests")
          .select(
            "id, request_code, user_id, service_name, plan_name, amount_tnd, account_email, status"
          )
          .eq("id", paymentSession.requestId)
          .single();

        if (requestError || !requestData) {
          setError("Could not load request details.");
          return;
        }

        // Verify ownership
        if (requestData.user_id !== user?.id) {
          setError("You don't have permission to access this payment session.");
          return;
        }

        // Verify request is awaiting payment
        if (requestData.status !== "Awaiting Payment") {
          setError("This request is no longer awaiting payment.");
          return;
        }

        setSession(paymentSession);
        setRequest({
          id: requestData.request_code,
          dbId: requestData.id,
          service: requestData.service_name,
          plan: requestData.plan_name,
          email: requestData.account_email,
          status: requestData.status,
          amountTND: Number(requestData.amount_tnd),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerId: requestData.user_id,
          ownerEmail: user?.email ?? "",
        });
      } catch (err) {
        console.error("Error loading session:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load payment session"
        );
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, user]);

  const handlePaymentSuccess = async () => {
    if (!session) return;

    try {
      setProcessing(true);
      await webhookService.simulatePaymentSuccess(session);

      // Simulate redirect delay
      await new Promise((resolve) =>
        setTimeout(resolve, SANDBOX_DELAYS.SUCCESS_CONFIRMATION)
      );

      toast.success("Payment successful! Redirecting...");
      navigate(`/payment-success?reference=${session.paymentReference}`);
    } catch (err) {
      console.error("Payment simulation error:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during payment processing"
      );
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentFailure = async () => {
    if (!session) return;

    try {
      setProcessing(true);
      const failureReasons = [
        "Insufficient funds",
        "Card declined",
        "Network timeout",
        "Invalid payment method",
      ];
      const randomReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      await webhookService.simulatePaymentFailure(session, randomReason);

      toast.error("Payment failed. Redirecting...");
      navigate(`/payment-failed?reference=${session.paymentReference}&reason=${randomReason}`);
    } catch (err) {
      console.error("Payment failure simulation error:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during payment processing"
      );
      toast.error("Failed to process payment failure.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!session) return;

    try {
      await paymentSessionService.cancelSession(session.id);
      toast.info("Payment cancelled");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error cancelling session:", err);
      toast.error("Failed to cancel payment session");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading payment session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !session || !request) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Payment Session Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {error || "An unexpected error occurred"}
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Sandbox Mode Banner */}
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Sandbox Mode:</strong> This is a test payment flow. Use the buttons below to
              simulate payment success or failure.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Request Summary */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{request.service}</p>
                        <p className="text-sm text-muted-foreground">{request.plan}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center font-semibold">
                      <span>Total Amount:</span>
                      <span className="text-lg">
                        {request.amountTND} {PAYMENT_SESSION_CONFIG.CURRENCY}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Select your preferred payment method</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMethod(method.id as any)}
                      className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                        selectedMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={processing}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            selectedMethod === method.id
                              ? "border-primary bg-primary"
                              : "border-border"
                          }`}
                        >
                          {selectedMethod === method.id && (
                            <div className="h-2 w-2 bg-background rounded-full" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                        {method.id === "D17" ? (
                          <Phone className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Sandbox Simulation Controls */}
              <Card className="border-border bg-blue-50/50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Lock className="h-4 w-4" />
                    Sandbox Simulation
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Choose an outcome to simulate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handlePaymentSuccess}
                    disabled={processing}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Simulate Successful Payment
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handlePaymentFailure}
                    disabled={processing}
                    size="lg"
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Simulate Failed Payment
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={processing}
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel Payment
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Order Details Sidebar */}
            <div>
              <Card className="sticky top-4 border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">Request ID</p>
                    <p className="font-mono font-medium break-all">{request.id}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground">Reference</p>
                    <p className="font-mono font-medium text-primary">{session.paymentReference}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg">
                      {request.amountTND} {PAYMENT_SESSION_CONFIG.CURRENCY}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground">Email</p>
                    <p className="text-sm break-all">{request.email}</p>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Secure checkout (Sandbox Mode)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
