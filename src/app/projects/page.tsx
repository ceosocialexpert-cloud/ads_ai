'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSessionId } from '@/lib/session';
import { Project } from '@/lib/supabase';
import styles from './page.module.css';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
        if (!confirm(`Ви дійсно хочете видалити проект "${projectName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/projects?projectId=${projectId}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (data.success) {
                // Remove project from state
                setProjects(projects.filter(p => p.id !== projectId));
            } else {
                alert('Не вдалося видалити проект: ' + data.error);
            }
        } catch (err) {
            alert('Помилка видалення проекту');
            console.error(err);
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
                        <h2>Збережені проекти</h2>
                        <p>Тут ви можете переглядати та керувати своїми збереженими проектами та цільовими аудиторіями</p>
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
                            <Link href="/" className="btn btn-primary">
                                Створити проект
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.projectsGrid}>
                            {projects.map((project) => (
                                <div key={project.id} className={styles.projectCard}>
                                    <div className={styles.cardHeader}>
                                        <h3>{project.name || 'Без назви'}</h3>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDeleteProject(project.id, project.name || 'Без назви')}
                                            title="Видалити проект"
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
                                            onClick={() => router.push(`/projects/${project.id}`)}
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
        </div>
    );
}