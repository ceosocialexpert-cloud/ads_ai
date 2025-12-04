'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import CreateProjectModal from '@/components/CreateProjectModal';
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
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const sessionId = getSessionId();

  // Load available projects
  useEffect(() => {
    loadAvailableProjects();
    loadChatHistory();
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

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success && data.messages) {
        setChatMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
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

  const handleCreateProject = async (data: any) => {
    try {
      console.log('Creating project with data:', data);
      
      // Add "creating" message to chat
      const creatingMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `🛠️ Створюю проект "${data.name}" та аналізую сайт...`,
        created_at: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, creatingMessage]);
      
      // First, trigger analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          data: { url: data.url },
          sessionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsCreateModalOpen(false);
        setPrefilledUrl('');
        
        // Add success message to chat
        const successMessage = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `✅ Проект "${data.name}" успішно створено! Знайдено ${result.analysis.target_audiences.length} сегментів цільової аудиторії.`,
          created_at: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, successMessage]);
        
        loadAvailableProjects();
        handleAnalysisComplete(result.project.id, result.analysis);
      } else {
        // Add error message to chat
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `❌ Помилка створення проекту: ${result.error}`,
          created_at: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      
      // Add error message to chat
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: '❌ Помилка створення проекту. Спробуйте ще раз.',
        created_at: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  const openCreateModalWithUrl = (url: string) => {
    setPrefilledUrl(url);
    setIsCreateModalOpen(true);
  };

  const handleGenerate = async (params: any) => {
    console.log('Generate with params:', params);
    
    // Add "generating" message to chat
    const generatingMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: '📡 Запуск генерації креативу... 🎨',
      created_at: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, generatingMessage]);
    
    try {
      // Create FormData to send files
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('projectId', params.projectId);
      formData.append('audienceId', params.audienceId);
      formData.append('size', params.size);
      formData.append('quantity', params.quantity.toString());
      
      // Add template files
      params.templateFiles.forEach((file: File) => {
        formData.append('templateFiles', file);
      });
      
      // Add logo files
      params.logoFiles.forEach((file: File) => {
        formData.append('logoFiles', file);
      });
      
      // Add person files
      params.personFiles.forEach((file: File) => {
        formData.append('personFiles', file);
      });
      
      const response = await fetch('/api/generate-creative', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Creative generation response:', data);
        
        // Reload chat history to get the saved message with image
        await loadChatHistory();
      } else {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: '❌ Помилка генерації: ' + data.error,
          created_at: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: '❌ Помилка генерації. Спробуйте ще раз.',
        created_at: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* Chat Interface - Full screen */}
        <div className={styles.chatContainer}>
          <ChatInterface 
            onAnalysisComplete={handleAnalysisComplete}
            initialMessages={chatMessages}
            onOpenCreateModal={openCreateModalWithUrl}
            availableProjects={availableProjects}
            currentProject={currentProject}
            onProjectSelect={handleProjectSelect}
          />
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPrefilledUrl('');
        }}
        onSubmit={handleCreateProject}
        initialUrl={prefilledUrl}
      />
    </div>
  );
}