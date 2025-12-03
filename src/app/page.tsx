'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import BottomGenerationBar from '@/components/BottomGenerationBar';
import { getSessionId } from '@/lib/session';
import styles from './page.module.css';

export default function Home() {
  const [currentProject, setCurrentProject] = useState<{
    id: string;
    analysis: any;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const sessionId = getSessionId();

  // Load available projects
  useEffect(() => {
    loadAvailableProjects();
  }, []);

  // Check for saved project/audience selection
  useEffect(() => {
    const savedProjectId = localStorage.getItem('selectedProjectId');
    const savedAudienceId = localStorage.getItem('selectedAudienceId');
    
    if (savedProjectId && savedAudienceId) {
      setSelectedProjectId(savedProjectId);
      setSelectedAudienceId(savedAudienceId);
      
      // Clear the saved selection
      localStorage.removeItem('selectedProjectId');
      localStorage.removeItem('selectedAudienceId');
      
      // Load the project details
      loadProjectDetails(savedProjectId);
    }
  }, []);

  const loadAvailableProjects = async () => {
    try {
      const response = await fetch(`/api/projects?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setAvailableProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects?sessionId=${sessionId}&projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setCurrentProject({
          id: data.project.id,
          analysis: {
            target_audiences: data.project.target_audiences || []
          }
        });
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    if (!projectId) {
      setCurrentProject(null);
      return;
    }
    await loadProjectDetails(projectId);
  };

  const handleAnalysisComplete = (projectId: string, analysis: any) => {
    setCurrentProject({
      id: projectId,
      analysis,
    });
    // Reload projects list to include new project
    loadAvailableProjects();
  };

  const handleGenerate = async (params: any) => {
    console.log('Generate with params:', params);
    // TODO: Implement generation logic
    alert('Генерація креативів...');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>
            <span className={styles.logoIcon}>🎨</span>
            AI Creative Generator
          </h1>
          <nav className={styles.nav}>
            <Link href="/projects" className="btn btn-secondary">
              📁 Проекти
            </Link>
            <Link href="/gallery" className="btn btn-secondary">
              🖼️ Галерея
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* Chat Interface - Full screen */}
        <div className={styles.chatContainer}>
          <ChatInterface onAnalysisComplete={handleAnalysisComplete} />
        </div>
      </main>

      {/* Bottom Generation Bar - Fixed */}
      <BottomGenerationBar
        availableProjects={availableProjects}
        currentProject={currentProject}
        onProjectSelect={handleProjectSelect}
        onGenerate={handleGenerate}
      />
    </div>
  );
}