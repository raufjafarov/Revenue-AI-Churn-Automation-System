import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Send } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import revaLogo from "@/assets/reva-logo.png";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Müştərilər", url: "/customers", icon: Users },
  { title: "Kampaniyalar", url: "/campaigns", icon: Send },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          {collapsed ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-elegant-md overflow-hidden">
              <img src={revaLogo} alt="REVA" className="h-7 w-7 object-contain" />
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <img src={revaLogo} alt="REVA Technology Solutions" className="h-10 w-auto object-contain" />
              <div className="flex flex-col leading-tight ml-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Growth AI</span>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Naviqasiya</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink to={item.url} end={item.url === "/"}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
