import { Logo } from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Wallet,
  Repeat,
  Receipt,
  ListTodo,
  Settings,
  LogOut,
  HelpCircle,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const groups = [
  {
    label: "Main",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard, end: true },
      { title: "Requests", url: "/dashboard?tab=requests", icon: ListTodo },
    ],
  },
  {
    label: "Money",
    items: [
      { title: "Balance", url: "/dashboard?tab=balance", icon: Wallet },
      { title: "Payments", url: "/dashboard?tab=payments", icon: Receipt },
    ],
  },
  {
    label: "Services",
    items: [{ title: "Subscriptions", url: "/dashboard?tab=subs", icon: Repeat }],
  },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const doSignOut = async () => {
    try {
      await signOut();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign out failed.");
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2 px-4">
        {!collapsed && <Logo />}
      </div>

      <SidebarContent className="gap-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {profile?.role === "admin" && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin panel</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto">
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href="#"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <HelpCircle className="h-4 w-4" />
                      {!collapsed && <span>Help & support</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href="#"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <Settings className="h-4 w-4" />
                      {!collapsed && <span>Settings</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      type="button"
                      onClick={doSignOut}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <LogOut className="h-4 w-4" />
                      {!collapsed && <span>Log out</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
