import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Copy,
  Download,
  Home,
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { paymentSessionService } from "@/services/payment-session.service";
import { PAYMENT_SESSION_CONFIG } from "@/lib/payment.constants";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [requestData, setRequestData] = useState<any>(null);

  const paymentReference = params.get("reference");

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setLoading(true);

        if (!paymentReference) {
          console.error("No payment reference provided");
          return;
        }

        // Fetch payment data
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .select("id, request_id, amount_tnd, payment_reference, status, created_at")
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
            "id, request_code, service_name, plan_name, amount_tnd, status, created_at, user_id"
          )
          .eq("id", payment.request_id)
          .single();

        if (requestError || !request) {
          console.error("Request not found:", requestError);
          return;
        }

        // Verify ownership
        if (request.user_id !== user?.id) {
          console.error("Unauthorized access to payment");
          return;
        }

        setPaymentData(payment);
        setRequestData(request);
      } catch (err) {
        console.error("Error loading payment data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [paymentReference, user]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadReceipt = () => {
    if (!paymentData || !requestData) return;

    const receiptContent = `
PAYMENT RECEIPT
${new Array(50).fill("=").join("")}

Request ID: ${requestData.request_code}
Payment Reference: ${paymentData.payment_reference}

Service: ${requestData.service_name}
Plan: ${requestData.plan_name}

Amount: ${paymentData.amount_tnd} ${PAYMENT_SESSION_CONFIG.CURRENCY}
Status: ${paymentData.status}
Date: ${formatDate(paymentData.created_at)}

Payment Method: Sandbox
${new Array(50).fill("=").join("")}

Thank you for your payment!
    `;

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(receiptContent)
    );
    element.setAttribute(
      "download",
      `receipt-${requestData.request_code}-${Date.now()}.txt`
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success("Receipt downloaded");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-12 w-12 bg-muted rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading payment confirmation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!paymentData || !requestData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Could not load payment information. Please check your request details.
              </p>
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                <Home className="h-4 w-4 mr-2" />
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
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Your payment has been confirmed and processed.
            </p>
          </div>

          {/* Payment Confirmation Cards */}
          <div className="grid gap-4 mb-6">
            {/* Main Confirmation Card */}
            <Card className="border-green-200/50 bg-green-50/30">
              <CardHeader>
                <CardTitle className="text-lg">Confirmation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Request ID</p>
                    <p className="font-mono font-semibold text-sm flex items-center gap-2">
                      {requestData.request_code}
                      <button
                        onClick={() =>
                          copyToClipboard(requestData.request_code, "Request ID")
                        }
                        className="p-1 hover:bg-muted rounded transition"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Payment Reference</p>
                    <p className="font-mono font-semibold text-sm text-green-600 flex items-center gap-2">
                      {paymentData.payment_reference}
                      <button
                        onClick={() =>
                          copyToClipboard(
                            paymentData.payment_reference,
                            "Payment Reference"
                          )
                        }
                        className="p-1 hover:bg-muted rounded transition"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Details Card */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start pb-3 border-b">
                    <div>
                      <p className="font-medium">{requestData.service_name}</p>
                      <p className="text-sm text-muted-foreground">{requestData.plan_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Amount Paid</p>
                        <p className="font-semibold">
                          {paymentData.amount_tnd} {PAYMENT_SESSION_CONFIG.CURRENCY}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-semibold text-sm">
                          {formatDate(paymentData.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Method</p>
                        <p className="font-semibold text-sm">Sandbox</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="font-semibold text-sm text-green-600">
                          {paymentData.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps Card */}
            <Card className="border-blue-200/50 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-lg">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5">
                      1
                    </div>
                    <span>Your request status has been updated to "Paid"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5">
                      2
                    </div>
                    <span>Our team will review and process your request shortly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5">
                      3
                    </div>
                    <span>You'll receive a notification when your subscription is activated</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              onClick={downloadReceipt}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="flex-1" size="lg">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Support Notice */}
          <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Check your email for the payment confirmation or{" "}
              <a href="/support" className="text-primary hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;
