'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSessionId } from '@/lib/session';
import { Project } from '@/lib/supabase';
import CreateProjectModal from '@/components/CreateProjectModal';
import type { ProjectData } from '@/components/CreateProjectModal';
import AnalysisConfirmModal from '@/components/AnalysisConfirmModal';
import styles from './page.module.css';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [createdProject, setCreatedProject] = useState<{ id: string; name: string; url: string } | null>(null);
    const router = useRouter();
    const sessionId = getSessionId();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.success) {
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
        
        if (!confirm(`Ви дійсно хочете видалити проект "${projectName}"?`)) {
            console.log('Delete cancelled by user');
            return;
        }

        try {
            console.log('Sending delete request...');
            const response = await fetch(`/api/projects?projectId=${projectId}`, {
                method: 'DELETE',
            });
            
            console.log('Delete response status:', response.status);
            const data = await response.json();
            console.log('Delete response data:', data);

            if (data.success) {
                console.log('Project deleted successfully');
                // Remove project from state
                setProjects(projects.filter(p => p.id !== projectId));
                alert('✅ Проект успішно видалено');
            } else {
                console.error('Delete failed:', data.error);
                alert('Не вдалося видалити проект: ' + data.error);
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Помилка видалення проекту: ' + (err instanceof Error ? err.message : 'Невідома помилка'));
        }
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
                    icon: iconBase64,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setIsModalOpen(false);
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
            const response = await fetch('/api/analyze-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: createdProject.id }),
            });

            const data = await response.json();

            if (data.success) {
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

    const handleAnalysisSkip = () => {
        setIsAnalysisModalOpen(false);
        setCreatedProject(null);
        alert(`✅ Проект "${createdProject?.name}" створено без аналізу`);
        loadProjects();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.logo}>
                        <span className={styles.logoIcon}>📁</span>
                        Мої проекти
                    </h1>
                    <nav className={styles.nav}>
                        <Link href="/" className="btn btn-secondary">
                            🏠 Головна
                        </Link>
                        <Link href="/gallery" className="btn btn-secondary">
                            🖼️ Галерея
                        </Link>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.content}>
                    <div className={styles.headerSection}>
                        <div>
                            <h2>Збережені проекти</h2>
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
                                <div key={project.id} className={styles.projectCard}>
                                    <div className={styles.cardHeader}>
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
                                            <a href={project.url} target="_blank" rel="noopener noreferrer">
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
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('Navigate to project:', project.id);
                                                router.push(`/projects/${project.id}`);
                                            }}
                                            type="button"
                                        >
                                            Переглянути деталі
                                        </button>
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
        </div>
    );
}