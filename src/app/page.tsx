'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import GenerationSettings from '@/components/GenerationSettings';
import { TargetAudience } from '@/lib/supabase';
import styles from './page.module.css';

export default function Home() {
  const [currentProject, setCurrentProject] = useState<{
    id: string;
    analysis: any;
  } | null>(null);

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
            <Link href="/gallery" className="btn btn-secondary">
              🖼️ Галерея
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
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
