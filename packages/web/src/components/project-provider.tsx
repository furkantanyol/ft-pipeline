'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/projects';

const COOKIE_NAME = 'active_project';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type ProjectContextValue = {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  setActiveProject: (id: string) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  projects,
  initialProjectId,
  children,
}: {
  projects: Project[];
  initialProjectId: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const setActiveProject = useCallback(
    (id: string) => {
      setActiveProjectId(id);
      document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${COOKIE_MAX_AGE}`;
      router.refresh();
    },
    [router],
  );

  return (
    <ProjectContext.Provider value={{ projects, activeProjectId, activeProject, setActiveProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider.');
  }
  return context;
}
