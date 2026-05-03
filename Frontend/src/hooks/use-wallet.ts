import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { walletService } from "@/services/wallet.service";

export function useWallet() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const paymentRequestsQuery = useQuery({
    queryKey: ["payment_requests", isAdmin ? "admin" : user?.id],
    queryFn: () => walletService.listPaymentRequests(isAdmin, user?.id),
    enabled: !!user,
  });

  const transactionsQuery = useQuery({
    queryKey: ["wallet_transactions", isAdmin ? "admin" : user?.id],
    queryFn: () => walletService.listTransactions(isAdmin, user?.id),
    enabled: !!user,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["payment_requests"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet_transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["requests"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  };

  const createRequestMutation = useMutation({
    mutationFn: async (input: {
      amount: number;
      method: "D17" | "Bank Transfer" | "Flouci";
      transactionReference?: string;
      screenshotUrl?: string;
      note?: string;
    }) => walletService.createPaymentRequest(input),
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: async (input: { id: string; adminNote?: string }) =>
      walletService.approvePaymentRequest(input.id, input.adminNote),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async (input: { id: string; adminNote?: string }) =>
      walletService.rejectPaymentRequest(input.id, input.adminNote),
    onSuccess: invalidate,
  });

  return {
    paymentRequests: paymentRequestsQuery.data ?? [],
    walletTransactions: transactionsQuery.data ?? [],
    isLoading: paymentRequestsQuery.isLoading || transactionsQuery.isLoading,
    createPaymentRequest: async (input: {
      amount: number;
      method: "D17" | "Bank Transfer" | "Flouci";
      transactionReference?: string;
      screenshotUrl?: string;
      note?: string;
    }) => createRequestMutation.mutateAsync(input),
    approvePaymentRequest: async (id: string, adminNote?: string) =>
      approveMutation.mutateAsync({ id, adminNote }),
    rejectPaymentRequest: async (id: string, adminNote?: string) =>
      rejectMutation.mutateAsync({ id, adminNote }),
  };
}
