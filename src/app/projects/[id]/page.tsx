'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSessionId } from '@/lib/session';
import { Project, TargetAudience } from '@/lib/supabase';
import styles from './page.module.css';

export default function ProjectDetailPage() {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const router = useRouter();
    const params = useParams();
    const sessionId = getSessionId();
    const projectId = params.id as string;

    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects?sessionId=${sessionId}&projectId=${projectId}`);
            const data = await response.json();

            if (data.success) {
                setProject(data.project);
            } else {
                setError(data.error || 'Не вдалося завантажити проект');
            }
        } catch (err) {
            setError('Помилка завантаження проекту');
            console.error(err);
        } finally {
            setLoading(false);
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

    const handleUseInGenerator = (audienceId: string) => {
        // Store the selected project and audience in localStorage
        localStorage.setItem('selectedProjectId', projectId);
        localStorage.setItem('selectedAudienceId', audienceId);
        
        // Redirect to main page with parameters
        router.push('/');
    };

    const handleRunAnalysis = async () => {
        if (!project || !project.url) {
            alert('Для аналізу потрібна URL адреса проекту');
            return;
        }

        if (!confirm('Запустити аналіз проекту та визначити цільові аудиторії?')) {
            return;
        }

        try {
            setIsAnalyzing(true);
            const response = await fetch('/api/analyze-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id }),
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Аналіз завершено успішно!');
                // Reload project to show new audiences
                loadProject();
            } else {
                alert('Помилка аналізу: ' + data.error);
            }
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Помилка запуску аналізу');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.logo}>
                            <span className={styles.logoIcon}>📁</span>
                            Деталі проекту
                        </h1>
                        <nav className={styles.nav}>
                            <Link href="/projects" className="btn btn-secondary">
                                ← Назад до проектів
                            </Link>
                        </nav>
                    </div>
                </header>

                <main className={styles.main}>
                    <div className={styles.loading}>
                        <div className="spinner"></div>
                        <span>Завантаження проекту...</span>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.logo}>
                            <span className={styles.logoIcon}>📁</span>
                            Деталі проекту
                        </h1>
                        <nav className={styles.nav}>
                            <Link href="/projects" className="btn btn-secondary">
                                ← Назад до проектів
                            </Link>
                        </nav>
                    </div>
                </header>

                <main className={styles.main}>
                    <div className={styles.error}>
                        <p>❌ {error || 'Проект не знайдено'}</p>
                        <Link href="/projects" className="btn btn-primary">
                            Повернутися до проектів
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.logo}>
                        <span className={styles.logoIcon}>📁</span>
                        Деталі проекту
                    </h1>
                    <nav className={styles.nav}>
                        <Link href="/projects" className="btn btn-secondary">
                            ← Назад до проектів
                        </Link>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.projectHeader}>
                    <div>
                        <h2>{project.name || 'Проект без назви'}</h2>
                        {project.url && (
                            <div className={styles.projectUrl}>
                                <span>🌐</span>
                                <a href={project.url} target="_blank" rel="noopener noreferrer">
                                    {project.url}
                                </a>
                            </div>
                        )}
                        <div className={styles.projectMeta}>
                            <span>📅 Створено: {formatDate(project.created_at)}</span>
                        </div>
                    </div>
                    <div>
                        <button
                            className="btn btn-primary"
                            onClick={handleRunAnalysis}
                            disabled={isAnalyzing || !project.url}
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                    Аналізую...
                                </>
                            ) : (
                                '🎯 Запустити аналіз'
                            )}
                        </button>
                    </div>
                </div>

                {project.description && (
                    <div className={styles.projectDescription}>
                        <h3>Опис проекту</h3>
                        <p>{project.description}</p>
                    </div>
                )}

                {project.analysis_result && (
                    <div className={styles.analysisSection}>
                        <h3>Аналіз проекту</h3>
                        <div className={styles.analysisCard}>
                            <h4>Загальний опис</h4>
                            <p>{project.analysis_result.summary}</p>
                            
                            <h4>Ключові особливості</h4>
                            <ul>
                                {project.analysis_result.key_features.map((feature, index) => (
                                    <li key={index}>{feature}</li>
                                ))}
                            </ul>
                            
                            <h4>Тон бренду</h4>
                            <p>{project.analysis_result.brand_voice}</p>
                        </div>
                    </div>
                )}

                <div className={styles.audiencesSection}>
                    <div className={styles.sectionHeader}>
                        <h3>Цільові аудиторії</h3>
                        <p>Всього знайдено: {project.target_audiences?.length || 0}</p>
                    </div>
                    
                    {project.target_audiences && project.target_audiences.length > 0 ? (
                        <div className={styles.audiencesGrid}>
                            {project.target_audiences.map((audience) => (
                                <div key={audience.id} className={styles.audienceCard}>
                                    <div className={styles.audienceHeader}>
                                        <h4>{audience.name}</h4>
                                    </div>
                                    
                                    <div className={styles.audienceContent}>
                                        <p><strong>Опис:</strong> {audience.description}</p>
                                        
                                        <div className={styles.audienceDetails}>
                                            <div className={styles.detailGroup}>
                                                <h5>Болі</h5>
                                                <ul>
                                                    {audience.pain_points.map((pain, index) => (
                                                        <li key={index}>{pain}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            
                                            <div className={styles.detailGroup}>
                                                <h5>Потреби</h5>
                                                <ul>
                                                    {audience.needs.map((need, index) => (
                                                        <li key={index}>{need}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            
                                            {audience.demographics && Object.keys(audience.demographics).length > 0 && (
                                                <div className={styles.detailGroup}>
                                                    <h5>Демографія</h5>
                                                    <ul>
                                                        {Object.entries(audience.demographics).map(([key, value], index) => (
                                                            <li key={index}><strong>{key}:</strong> {value}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className={styles.audienceActions}>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => handleUseInGenerator(audience.id)}
                                        >
                                            Використати для генерації
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Для цього проекту не знайдено цільових аудиторій</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}