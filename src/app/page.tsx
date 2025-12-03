'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import GenerationSettings from '@/components/GenerationSettings';
import { getSessionId } from '@/lib/session';
import styles from './page.module.css';

export default function Home() {
  const [currentProject, setCurrentProject] = useState<{
    id: string;
    analysis: any;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const sessionId = getSessionId();

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

  const handleAnalysisComplete = (projectId: string, analysis: any) => {
    setCurrentProject({
      id: projectId,
      analysis,
    });
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
        {!currentProject && (
          <div className={styles.featuresBanner}>
            <h2>🎨 Нові можливості генератора</h2>
            <p>Тепер ви можете зберігати результати аналізу та повторно використовувати цільові аудиторії для створення креативів!</p>
            
            <div className={styles.featuresList}>
              <div className={styles.featureCard}>
                <h3>📁 Проекти</h3>
                <p>Зберігайте результати аналізу в окремих проектах для подальшого використання</p>
              </div>
              
              <div className={styles.featureCard}>
                <h3>👥 Цільові аудиторії</h3>
                <p>Переглядайте та керуйте визначеними сегментами ЦА в спеціальному розділі</p>
              </div>
              
              <div className={styles.featureCard}>
                <h3>🔄 Повторне використання</h3>
                <p>Повертайтесь до раніше створених проектів без необхідності повторного аналізу</p>
              </div>
            </div>
          </div>
        )}
        
        <div className={styles.layout}>
          {/* Left Panel - Generation Settings */}
          {currentProject && (
            <aside className={styles.sidebar}>
              <GenerationSettings
                projectId={currentProject.id}
                targetAudiences={currentProject.analysis.target_audiences || []}
                onGenerationComplete={(creatives) => {
                  console.log('Generated creatives:', creatives);
                }}
              />
            </aside>
          )}

          {/* Right Panel - Chat */}
          <div className={styles.chatPanel}>
            <ChatInterface onAnalysisComplete={handleAnalysisComplete} />
          </div>
        </div>
      </main>
    </div>
  );
}