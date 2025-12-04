'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSessionId } from '@/lib/session';
import { Project } from '@/lib/supabase';
import CreateProjectModal from '@/components/CreateProjectModal';
import type { ProjectData } from '@/components/CreateProjectModal';
import AnalysisConfirmModal from '@/components/AnalysisConfirmModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import styles from './page.module.css';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [createdProject, setCreatedProject] = useState<{ id: string; name: string; url: string } | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
    const router = useRouter();
    const sessionId = getSessionId();

    useEffect(() => {
        loadProjects();
    }, []);

    // Reload projects when page becomes visible (after returning from settings)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('Page visible, reloading projects...');
                loadProjects();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.success) {
                console.log('Loaded projects:', data.projects.map((p: Project) => ({
                    id: p.id,
                    name: p.name,
                    hasScreenshot: !!p.screenshot_url,
                    screenshotUrl: p.screenshot_url
                })));
                setProjects(data.projects);
            } else {
                setError(data.error || 'Не вдалося завантажити проекти');
            }
        } catch (err) {
            setError('Помилка завантаження проектів');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        console.log('Delete button clicked for project:', projectId, projectName);
        
        // Show custom modal instead of browser confirm
        setProjectToDelete({ id: projectId, name: projectName });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;

        try {
            console.log('Sending delete request...');
            const response = await fetch(`/api/projects?projectId=${projectToDelete.id}`, {
                method: 'DELETE',
            });
            
            console.log('Delete response status:', response.status);
            const data = await response.json();
            console.log('Delete response data:', data);

            if (data.success) {
                console.log('Project deleted successfully');
                // Remove project from state
                setProjects(projects.filter(p => p.id !== projectToDelete.id));
                setIsDeleteModalOpen(false);
                setProjectToDelete(null);
                alert('✅ Проект успішно видалено');
            } else {
                console.error('Delete failed:', data.error);
                alert('Не вдалося видалити проект: ' + data.error);
                setIsDeleteModalOpen(false);
                setProjectToDelete(null);
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Помилка видалення проекту: ' + (err instanceof Error ? err.message : 'Невідома помилка'));
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
        }
    };

    const cancelDelete = () => {
        console.log('Delete cancelled by user');
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
    };

    const handleCreateProject = async (projectData: ProjectData) => {
        try {
            // Convert icon to base64 if present
            let iconBase64 = null;
            if (projectData.icon) {
                iconBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(projectData.icon!);
                });
            }

            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    name: projectData.name,
                    url: projectData.url,
                    language: projectData.language || 'uk',
                    icon: iconBase64,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setIsModalOpen(false);
                
                // Save success message to chat history
                await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        message: 'system',
                        systemMessage: `✅ Проект "${projectData.name}" успішно створено!`,
                        saveOnly: true,
                    }),
                });
                
                // Store created project data
                setCreatedProject({
                    id: data.project.id,
                    name: projectData.name,
                    url: projectData.url || '',
                });
                // Show analysis confirmation modal
                setIsAnalysisModalOpen(true);
            } else {
                alert('Помилка створення проекту: ' + data.error);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Помилка створення проекту');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const handleAnalysisConfirm = async () => {
        if (!createdProject) return;

        try {
            // Save "analysis started" message to chat
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    message: 'system',
                    systemMessage: `🔄 Запускаю аналіз проекту "${createdProject.name}"...`,
                    saveOnly: true,
                }),
            });
            
            const response = await fetch('/api/analyze-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: createdProject.id }),
            });

            const data = await response.json();

            if (data.success) {
                // Save success message to chat
                await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        message: 'system',
                        systemMessage: `✅ Аналіз проекту "${createdProject.name}" завершено успішно! Знайдено ${data.analysis?.target_audiences?.length || 0} сегментів аудиторії.`,
                        saveOnly: true,
                    }),
                });
                
                setIsAnalysisModalOpen(false);
                setCreatedProject(null);
                alert(`✅ Аналіз проекту "${createdProject.name}" завершено успішно!`);
                loadProjects();
            } else {
                console.error('Analysis error response:', data);
                alert('Помилка аналізу: ' + (data.error || 'Невідома помилка'));
                setIsAnalysisModalOpen(false);
                loadProjects();
            }
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Помилка запуску аналізу: ' + (error instanceof Error ? error.message : 'Невідома помилка'));
            setIsAnalysisModalOpen(false);
            loadProjects();
        }
    };

    const handleAnalysisSkip = async () => {
        // Save "skip analysis" message to chat
        await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                message: 'system',
                systemMessage: `✅ Проект "${createdProject?.name}" створено без аналізу`,
                saveOnly: true,
            }),
        });
        
        setIsAnalysisModalOpen(false);
        setCreatedProject(null);
        alert(`✅ Проект "${createdProject?.name}" створено без аналізу`);
        loadProjects();
    };

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <div className={styles.content}>
                    <div className={styles.headerSection}>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>📁 Мої проекти</h1>
                            <p>Тут ви можете переглядати та керувати своїми збереженими проектами та цільовими аудиторіями</p>
                        </div>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setIsModalOpen(true)}
                        >
                            + Створити проект
                        </button>
                    </div>

                    {loading ? (
                        <div className={styles.loading}>
                            <div className="spinner"></div>
                            <span>Завантаження проектів...</span>
                        </div>
                    ) : error ? (
                        <div className={styles.error}>
                            <p>❌ {error}</p>
                            <button className="btn btn-primary" onClick={loadProjects}>
                                Спробувати ще раз
                            </button>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className={styles.emptyState}>
                            <h3>У вас ще немає збережених проектів</h3>
                            <p>Проведіть аналіз сайту або опису в головному інтерфейсі, щоб створити свій перший проект.</p>
                            <button 
                                className="btn btn-primary"
                                onClick={() => setIsModalOpen(true)}
                            >
                                Створити проект
                            </button>
                        </div>
                    ) : (
                        <div className={styles.projectsGrid}>
                            {projects.map((project) => (
                                <div 
                                    key={project.id} 
                                    className={styles.projectCard}
                                    onClick={() => router.push(`/projects/${project.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.projectIcon}>
                                            {project.screenshot_url ? (
                                                <img 
                                                    src={project.screenshot_url} 
                                                    alt={project.name || 'Project icon'} 
                                                    className={styles.projectIconImage}
                                                />
                                            ) : (
                                                <div className={styles.projectIconPlaceholder}>
                                                    📁
                                                </div>
                                            )}
                                        </div>
                                        <h3>{project.name || 'Без назви'}</h3>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeleteProject(project.id, project.name || 'Без назви');
                                            }}
                                            title="Видалити проект"
                                            type="button"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    
                                    {project.url && (
                                        <div className={styles.projectUrl}>
                                            <span>🌐</span>
                                            <a 
                                                href={project.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {project.url}
                                            </a>
                                        </div>
                                    )}
                                    
                                    {project.description && (
                                        <div className={styles.projectDescription}>
                                            <p>{project.description}</p>
                                        </div>
                                    )}
                                    
                                    <div className={styles.cardFooter}>
                                        <span className={styles.date}>
                                            Створено: {formatDate(project.created_at)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateProject}
            />

            {/* Analysis Confirmation Modal */}
            {createdProject && (
                <AnalysisConfirmModal
                    isOpen={isAnalysisModalOpen}
                    projectName={createdProject.name}
                    projectUrl={createdProject.url}
                    onConfirm={handleAnalysisConfirm}
                    onSkip={handleAnalysisSkip}
                />
            )}

            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    projectName={projectToDelete.name}
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            )}
        </div>
    );
}