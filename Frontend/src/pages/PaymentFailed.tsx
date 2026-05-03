import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  Home,
  Copy,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PAYMENT_SESSION_CONFIG } from "@/lib/payment.constants";
import { supabase } from "@/lib/supabase";

const PaymentFailed = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<any>(null);

  const paymentReference = params.get("reference");
  const failureReason = params.get("reason") || "Payment could not be processed";

  useEffect(() => {
    const loadRequestData = async () => {
      try {
        setLoading(true);

        if (!paymentReference) {
          console.error("No payment reference provided");
          return;
        }

        // Fetch payment to get request
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .select("request_id")
          .eq("payment_reference", paymentReference)
          .single();

        if (paymentError || !payment) {
          console.error("Payment not found:", paymentError);
          return;
        }

        // Fetch request data
        const { data: request, error: requestError } = await supabase
          .from("requests")
          .select(
            "id, request_code, service_name, plan_name, amount_tnd, status, user_id"
          )
          .eq("id", payment.request_id)
          .single();

        if (requestError || !request) {
          console.error("Request not found:", requestError);
          return;
        }

        // Verify ownership
        if (request.user_id !== user?.id) {
          console.error("Unauthorized access to request");
          return;
        }

        setRequestData(request);
      } catch (err) {
        console.error("Error loading request data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRequestData();
  }, [paymentReference, user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Reference copied to clipboard");
  };

  const handleRetryPayment = () => {
    if (!requestData) return;
    navigate(`/checkout?session=${requestData.id}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-12 w-12 bg-muted rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading payment details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Error Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Failed</h1>
            <p className="text-muted-foreground">
              We couldn't process your payment. Please try again.
            </p>
          </div>

          {/* Error Alert */}
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Reason:</strong> {failureReason}
            </AlertDescription>
          </Alert>

          {/* Payment Details */}
          <div className="grid gap-4 mb-6">
            {/* Failed Payment Card */}
            <Card className="border-red-200/50 bg-red-50/30">
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requestData && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Request ID</p>
                        <p className="font-mono font-semibold text-sm flex items-center gap-2">
                          {requestData.request_code}
                          <button
                            onClick={() =>
                              copyToClipboard(requestData.request_code)
                            }
                            className="p-1 hover:bg-muted rounded transition"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Payment Reference</p>
                        <p className="font-mono font-semibold text-sm text-red-600 flex items-center gap-2">
                          {paymentReference?.slice(0, 15)}...
                          <button
                            onClick={() => copyToClipboard(paymentReference || "")}
                            className="p-1 hover:bg-muted rounded transition"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">{requestData.service_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">{requestData.plan_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-semibold">
                          {requestData.amount_tnd} {PAYMENT_SESSION_CONFIG.CURRENCY}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <span className="text-red-600 font-semibold">
                          {requestData.status}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Troubleshooting Card */}
            <Card className="border-blue-200/50 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Troubleshooting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Check that your payment details are correct</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Verify you have sufficient funds or credit limit</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Try again with a different payment method</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Contact your payment provider if the issue persists</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Retry Information */}
            <Card className="border-amber-200/50 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="text-lg">Important Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-900">
                  Your payment session is still active and waiting for payment. You can retry
                  the payment immediately or create a new session later. The request status
                  remains{" "}
                  <span className="font-semibold">"Awaiting Payment"</span> until a successful
                  payment is made.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              onClick={handleRetryPayment}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Payment
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Support Notice */}
          <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              If you continue to experience issues,{" "}
              <a href="/support" className="text-primary hover:underline">
                contact our support team
              </a>{" "}
              for assistance.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentFailed;
