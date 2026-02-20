'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Star,
  Plus,
  Database,
  Zap,
  FlaskConical,
  MessageSquare,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { UserMenu } from '@/components/user-menu';
import { ProjectSelector } from '@/components/project-selector';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Rate', href: '/rate', icon: Star },
  { label: 'Add', href: '/add', icon: Plus },
  { label: 'Examples', href: '/examples', icon: Database },
  { label: 'Train', href: '/train', icon: Zap },
  { label: 'Eval', href: '/eval', icon: FlaskConical },
  { label: 'Playground', href: '/playground', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="space-y-3 px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-light tracking-tight text-foreground">aitelier</span>
        </Link>
        <ProjectSelector />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
