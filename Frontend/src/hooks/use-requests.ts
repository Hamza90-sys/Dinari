import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { notificationsService } from "@/services/notifications.service";
import { paymentsService } from "@/services/payments.service";
import { requestsService } from "@/services/requests.service";
import type { RequestStatus } from "@/types/domain";

export function useRequests() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["requests", isAdmin ? "admin" : user?.id],
    queryFn: () => requestsService.list(isAdmin, user?.id),
    enabled: !!user,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["requests"] }),
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (input: {
      service: string;
      plan: string;
      email: string;
      notes?: string;
      amountTND?: number;
      ownerEmail?: string;
    }) => {
      if (!user) throw new Error("Please sign in first.");
      const req = await requestsService.create({
        userId: user.id,
        service: input.service,
        plan: input.plan,
        accountEmail: input.email,
        notes: input.notes,
        amountTND: input.amountTND ?? 0,
      });

      await notificationsService.create({
        userId: user.id,
        title: "Request submitted",
        message: `Request ${req.id} was submitted successfully.`,
      });

      return req;
    },
    onSuccess: invalidate,
  });

  const payMutation = useMutation({
    mutationFn: async (requestCode: string) => {
      await requestsService.pay(requestCode, "D17");
    },
    onSuccess: invalidate,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ requestCode, status, adminNotes }: { requestCode: string; status: RequestStatus; adminNotes?: string }) => {
      await requestsService.setStatus(requestCode, status, adminNotes);
    },
    onSuccess: invalidate,
  });

  const notesMutation = useMutation({
    mutationFn: async ({ requestCode, notes }: { requestCode: string; notes: string }) => {
      await requestsService.setAdminNotes(requestCode, notes);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestCode: string) => {
      await requestsService.delete(requestCode);
    },
    onSuccess: invalidate,
  });

  const proofMutation = useMutation({
    mutationFn: async ({ requestCode, file }: { requestCode: string; file: File }) => {
      if (!user) throw new Error("Please sign in first.");
      await paymentsService.attachProofToRequestCode(requestCode, file, user.id);
    },
    onSuccess: invalidate,
  });

  return {
    requests: requestsQuery.data ?? [],
    isLoading: requestsQuery.isLoading,
    isFetching: requestsQuery.isFetching,
    createRequest: async (input: {
      service: string;
      plan: string;
      email: string;
      notes?: string;
      amountTND?: number;
      ownerEmail?: string;
    }) => createMutation.mutateAsync(input),
    payRequest: async (requestCode: string) => payMutation.mutateAsync(requestCode),
    setRequestStatus: async (requestCode: string, status: RequestStatus, adminNotes?: string) =>
      statusMutation.mutateAsync({ requestCode, status, adminNotes }),
    deleteRequest: async (requestCode: string) => deleteMutation.mutateAsync(requestCode),
    setAdminNotes: async (requestCode: string, notes: string) =>
      notesMutation.mutateAsync({ requestCode, notes }),
    setRequestProof: async (requestCode: string, file: File) =>
      proofMutation.mutateAsync({ requestCode, file }),
  };
}