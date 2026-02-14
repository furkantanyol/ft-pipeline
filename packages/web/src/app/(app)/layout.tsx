import { cookies } from 'next/headers';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { ProjectProvider } from '@/components/project-provider';
import { getUserProjects } from '@/lib/projects';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const projects = await getUserProjects();
  const cookieStore = await cookies();
  const cookieProjectId = cookieStore.get('active_project')?.value ?? null;

  // Validate cookie value against actual projects, fallback to first
  const activeProjectId = projects.find((p) => p.id === cookieProjectId)
    ? cookieProjectId
    : (projects[0]?.id ?? null);

  return (
    <SidebarProvider>
      <ProjectProvider projects={projects} initialProjectId={activeProjectId}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </ProjectProvider>
    </SidebarProvider>
  );
}
