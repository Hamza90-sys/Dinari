import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usersService } from "@/services/users.service";

export function useUsersData() {
  const { user, isAdmin } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => usersService.getMyProfile(user!.id),
    enabled: !!user,
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles", isAdmin ? "admin" : user?.id],
    queryFn: () => usersService.listProfiles(),
    enabled: !!user && isAdmin,
  });

  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions", isAdmin ? "admin" : user?.id],
    queryFn: () => usersService.listSubscriptions(isAdmin, user?.id),
    enabled: !!user,
  });

  return {
    profile: profileQuery.data ?? null,
    profiles: profilesQuery.data ?? [],
    subscriptions: subscriptionsQuery.data ?? [],
    isLoadingProfile: profileQuery.isLoading,
  };
}