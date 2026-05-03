import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth.service";
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
      accountAccessType: "existing" | "new";
      accountPassword?: string;
      notes?: string;
      amountTND?: number;
      phoneNumber?: string;
      preferredContactMethod?: "Phone Call" | "WhatsApp" | "SMS";
      ownerEmail?: string;
    }) => {
      console.log("🚀 [useRequests] Create mutation started");
      
      if (!user) {
        console.error("❌ [useRequests] User not authenticated");
        throw new Error("Please sign in first.");
      }

      console.log("👤 [useRequests] Authenticated user:", user.id);

      try {
        console.log("👤 [useRequests] Ensuring profile exists (non-blocking)...");
        const profileStart = Date.now();
        authService
          .ensureProfile(user, (user.user_metadata?.full_name as string | undefined) ?? null)
          .then((profile) => {
            console.log("✅ [useRequests] Profile ready:", profile.id, `(${Date.now() - profileStart}ms)`);
          })
          .catch((error) => {
            console.error("⚠️ [useRequests] Profile ensure failed (non-blocking):", error);
          });

        console.log("📝 [useRequests] Creating request...");
        const requestPromise = requestsService.create({
          userId: user.id,
          service: input.service,
          plan: input.plan,
          accountEmail: input.email,
          accountAccessType: input.accountAccessType,
          accountPassword: input.accountPassword,
          notes: input.notes,
          amountTND: input.amountTND ?? 0,
          phoneNumber: input.phoneNumber,
          preferredContactMethod: input.preferredContactMethod,
        });
        const requestTimeout = new Promise<never>((_, reject) => {
          const timeoutId = window.setTimeout(() => {
            clearTimeout(timeoutId);
            reject(new Error("Request insert timed out. Please try again."));
          }, 7000);
        });

        const req = await Promise.race([requestPromise, requestTimeout]);

        console.log("✅ [useRequests] Request created:", req.id);

        try {
          console.log("🔔 [useRequests] Creating notification...");
          await notificationsService.create({
            userId: user.id,
            title: "Request submitted",
            message: `Request ${req.id} was submitted successfully.`,
          });
          console.log("✅ [useRequests] Notification created");
        } catch (notificationError) {
          console.error("⚠️ [useRequests] Notification creation failed (non-blocking):", notificationError);
          // Don't throw - notification failure shouldn't fail the whole operation
          // The request was already created successfully
        }

        console.log("✅ [useRequests] Mutation completed successfully");
        return req;
      } catch (error) {
        console.error("❌ [useRequests] Create mutation failed:", error);
        throw error;
      }
    },
    onSuccess: invalidate,
    onError: (error) => {
      console.error("❌ [useRequests] Mutation error callback:", error);
    },
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
      accountAccessType: "existing" | "new";
      accountPassword?: string;
      notes?: string;
      amountTND?: number;
      phoneNumber?: string;
      preferredContactMethod?: "Phone Call" | "WhatsApp" | "SMS";
      ownerEmail?: string;
    }) => createMutation.mutateAsync(input),
    payRequest: async (requestCode: string) => payMutation.mutateAsync(requestCode),
    setRequestStatus: async (requestCode: string, status: RequestStatus, adminNotes?: string) =>
      statusMutation.mutateAsync({ requestCode, status, adminNotes }),
    deleteRequest: async (requestCode: string) => deleteMutation.mutateAsync(requestCode),
    setAdminNotes: async (requestCode: string, notes: string) =>
      notesMutation.mutateAsync({ requestCode, notes }),
    revealPassword: async (requestCode: string) => requestsService.revealPassword(requestCode),
    setRequestProof: async (requestCode: string, file: File) =>
      proofMutation.mutateAsync({ requestCode, file }),
  };
}