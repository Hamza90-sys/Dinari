import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { notificationsService } from "@/services/notifications.service";

export function useNotifications() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", isAdmin ? "admin" : user?.id],
    queryFn: () => notificationsService.list(user!.id, isAdmin),
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => notificationsService.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: { userId: string; title: string; message: string }) =>
      notificationsService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    addNotification: async (input: { userId: string; title: string; message: string }) =>
      createMutation.mutateAsync(input),
    markRead: async (id: string) => markReadMutation.mutateAsync(id),
  };
}