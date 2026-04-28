import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { paymentsService } from "@/services/payments.service";

export function usePayments() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: ["payments", isAdmin ? "admin" : user?.id],
    queryFn: () => paymentsService.list(isAdmin, user?.id),
    enabled: !!user,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["requests"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  };

  const topUpMutation = useMutation({
    mutationFn: async (input: { amount: number; method?: string }) => {
      await paymentsService.topUp(input.amount, input.method ?? "D17");
    },
    onSuccess: invalidate,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      await paymentsService.withdraw(amount);
    },
    onSuccess: invalidate,
  });

  return {
    payments: paymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    topUp: async (amount: number, method = "D17") => topUpMutation.mutateAsync({ amount, method }),
    withdraw: async (amount: number) => withdrawMutation.mutateAsync(amount),
  };
}