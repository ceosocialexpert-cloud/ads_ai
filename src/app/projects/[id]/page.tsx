'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSessionId } from '@/lib/session';
import { Project, TargetAudience, Subproject } from '@/lib/supabase';
import SubprojectsSidebar from '@/components/SubprojectsSidebar';
import styles from './page.module.css';

export default function ProjectDetailPage() {
    const [project, setProject] = useState<Project | null>(null);
    const [subprojects, setSubprojects] = useState<Subproject[]>([]);
    const [selectedView, setSelectedView] = useState<'main' | string>('main'); // 'main' or subproject ID
    const [selectedSubproject, setSelectedSubproject] = useState<Subproject | null>(null);
    const [isAnalyzingSubproject, setIsAnalyzingSubproject] = useState(false);
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
            loadSubprojects();
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

    const loadSubprojects = async () => {
        try {
            const response = await fetch(`/api/subprojects?projectId=${projectId}`);
            const data = await response.json();
            if (data.success) {
                setSubprojects(data.subprojects || []);
            }
        } catch (err) {
            console.error('Failed to load subprojects:', err);
        }
    };

    const loadSubprojectDetails = async (subprojectId: string) => {
        try {
            const response = await fetch(`/api/subprojects?projectId=${projectId}&subprojectId=${subprojectId}`);
            const data = await response.json();
            if (data.success) {
                setSelectedSubproject(data.subproject);
            }
        } catch (err) {
            console.error('Failed to load subproject details:', err);
        }
    };

    const handleSubprojectClick = async (subprojectId: string) => {
        setSelectedView(subprojectId);
        await loadSubprojectDetails(subprojectId);
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
            console.log('Starting analysis for project:', project.id);
            
            const response = await fetch('/api/analyze-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id }),
            });

            console.log('Analysis response status:', response.status);
            const data = await response.json();
            console.log('Analysis response data:', data);

            if (data.success) {
                alert('✅ Аналіз завершено успішно!');
                // Reload project to show new audiences
                loadProject();
            } else {
                console.error('Analysis failed:', data);
                alert('Помилка аналізу: ' + (data.error || 'Невідома помилка'));
            }
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Помилка запуску аналізу: ' + (error instanceof Error ? error.message : 'Невідома помилка'));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRunSubprojectAnalysis = async () => {
        if (!selectedSubproject) {
            alert('Під-проект не вибрано');
            return;
        }

        if (!selectedSubproject.url) {
            alert('Для аналізу потрібна URL адреса під-проекту');
            return;
        }

        try {
            setIsAnalyzingSubproject(true);
            console.log('Starting analysis for subproject:', selectedSubproject.id);
            
            const response = await fetch('/api/analyze-subproject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subprojectId: selectedSubproject.id }),
            });

            console.log('Subproject analysis response status:', response.status);
            const data = await response.json();
            console.log('Subproject analysis response data:', data);

            if (data.success) {
                alert('✅ Аналіз під-проекту завершено успішно!');
                // Reload subproject details
                await loadSubprojectDetails(selectedSubproject.id);
            } else {
                console.error('Subproject analysis failed:', data);
                alert('Помилка аналізу: ' + (data.error || 'Невідома помилка'));
            }
        } catch (error) {
            console.error('Subproject analysis error:', error);
            alert('Помилка запуску аналізу: ' + (error instanceof Error ? error.message : 'Невідома помилка'));
        } finally {
            setIsAnalyzingSubproject(false);
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
            <main className={styles.mainWithSidebar}>
                <SubprojectsSidebar
                    projectId={projectId}
                    projectName={project.name || 'Проект'}
                    subprojects={subprojects}
                    selectedView={selectedView}
                    onSelectMain={() => setSelectedView('main')}
                    onSelectSubproject={handleSubprojectClick}
                    onAddSubproject={() => router.push(`/projects/${projectId}/subprojects/new`)}
                />

                <div className={styles.content}>
                    {selectedView === 'main' ? (
                        <>
                            {/* Main Project Content */}
                            <div className={styles.projectHeader}>
                                <div className={styles.projectTitleSection}>
                                    {project.screenshot_url ? (
                                        <img 
                                            src={project.screenshot_url} 
                                            alt={project.name || 'Project icon'} 
                                            className={styles.projectAvatar}
                                        />
                                    ) : (
                                        <div className={styles.projectAvatarPlaceholder}>
                                            📁
                                        </div>
                                    )}
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
                                </div>
                                <div className={styles.headerActions}>
                                    <Link 
                                        href={`/projects/${projectId}/settings`}
                                        className="btn btn-secondary"
                                    >
                                        ⚙️ Налаштування
                                    </Link>
                                    <button
                                        className="btn btn-primary"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleRunAnalysis();
                                        }}
                                        disabled={isAnalyzing || !project.url}
                                        type="button"
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
                                                        
                                                        {audience.demographics && (() => {
                                                            try {
                                                                // Handle both object and string demographics
                                                                let demo = audience.demographics;
                                                                
                                                                // If it's a string, try to parse as JSON
                                                                if (typeof demo === 'string') {
                                                                    try {
                                                                        demo = JSON.parse(demo);
                                                                    } catch (e) {
                                                                        // If parsing fails, it's just a plain text description
                                                                        return (
                                                                            <div className={styles.detailGroup}>
                                                                                <h5>Демографія</h5>
                                                                                <p>{String(demo)}</p>
                                                                            </div>
                                                                        );
                                                                    }
                                                                }
                                                                
                                                                // If it's an object with keys, display as key-value pairs
                                                                if (demo && typeof demo === 'object' && Object.keys(demo).length > 0) {
                                                                    return (
                                                                        <div className={styles.detailGroup}>
                                                                            <h5>Демографія</h5>
                                                                            <ul>
                                                                                {Object.entries(demo).map(([key, value], index) => (
                                                                                    <li key={index}><strong>{key}:</strong> {value as string}</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    );
                                                                }
                                                            } catch (error) {
                                                                console.error('Failed to render demographics:', error);
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </div>
                                                
                                                <div className={styles.audienceActions}>
                                                    <button 
                                                        className="btn btn-primary"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleUseInGenerator(audience.id);
                                                        }}
                                                        type="button"
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
                        </>
                    ) : (
                        <>
                            {/* Subproject Content */}
                            {selectedSubproject && (
                                <>
                                    <div className={styles.projectHeader}>
                                        <div className={styles.projectTitleSection}>
                                            <div className={styles.subprojectIconPlaceholder}>
                                                {selectedSubproject.type === 'webinar' && '🎥'}
                                                {selectedSubproject.type === 'landing' && '📄'}
                                                {selectedSubproject.type === 'campaign' && '📢'}
                                            </div>
                                            <div>
                                                <h2>{selectedSubproject.name}</h2>
                                                <div className={styles.projectUrl}>
                                                    <span>🌐</span>
                                                    <a href={selectedSubproject.url} target="_blank" rel="noopener noreferrer">
                                                        {selectedSubproject.url}
                                                    </a>
                                                </div>
                                                <div className={styles.projectMeta}>
                                                    <span>
                                                        {selectedSubproject.type === 'webinar' && '🎥 Вебінар'}
                                                        {selectedSubproject.type === 'landing' && '📄 Лендінг'}
                                                        {selectedSubproject.type === 'campaign' && '📢 Кампанія'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.headerActions}>
                                            <Link 
                                                href={`/projects/${projectId}/subprojects/${selectedSubproject.id}`}
                                                className="btn btn-secondary"
                                            >
                                                ⚙️ Редагувати
                                            </Link>
                                            <button
                                                className="btn btn-primary"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleRunSubprojectAnalysis();
                                                }}
                                                disabled={isAnalyzingSubproject || !selectedSubproject?.url}
                                                type="button"
                                            >
                                                {isAnalyzingSubproject ? (
                                                    <>
                                                        <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                                        Аналізую...
                                                    </>
                                                ) : (
                                                    '🎯 Аналіз під-проекту'
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedSubproject.description && (
                                        <div className={styles.projectDescription}>
                                            <h3>Опис під-проекту</h3>
                                            <p>{selectedSubproject.description}</p>
                                        </div>
                                    )}

                                    {selectedSubproject.analysis_result && (
                                        <div className={styles.analysisSection}>
                                            <h3>Аналіз під-проекту</h3>
                                            <div className={styles.analysisCard}>
                                                <h4>Загальний опис</h4>
                                                <p>{selectedSubproject.analysis_result.summary}</p>
                                                
                                                <h4>Ключові особливості</h4>
                                                <ul>
                                                    {selectedSubproject.analysis_result.key_features.map((feature, index) => (
                                                        <li key={index}>{feature}</li>
                                                    ))}
                                                </ul>
                                                
                                                <h4>Тон голосу</h4>
                                                <p>{selectedSubproject.analysis_result.brand_voice}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.audiencesSection}>
                                        <div className={styles.sectionHeader}>
                                            <h3>Цільові аудиторії</h3>
                                            <p>Всього знайдено: {selectedSubproject.target_audiences?.length || 0}</p>
                                        </div>
                                        
                                        {selectedSubproject.target_audiences && selectedSubproject.target_audiences.length > 0 ? (
                                            <div className={styles.audiencesGrid}>
                                                {selectedSubproject.target_audiences.map((audience) => (
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
                                                                
                                                                {audience.demographics && (() => {
                                                                    try {
                                                                        // Handle both object and string demographics
                                                                        let demo = audience.demographics;
                                                                        
                                                                        // If it's a string, try to parse as JSON
                                                                        if (typeof demo === 'string') {
                                                                            try {
                                                                                demo = JSON.parse(demo);
                                                                            } catch (e) {
                                                                                // If parsing fails, it's just a plain text description
                                                                                return (
                                                                                    <div className={styles.detailGroup}>
                                                                                        <h5>Демографія</h5>
                                                                                        <p>{String(demo)}</p>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        }
                                                                        
                                                                        // If it's an object with keys, display as key-value pairs
                                                                        if (demo && typeof demo === 'object' && Object.keys(demo).length > 0) {
                                                                            return (
                                                                                <div className={styles.detailGroup}>
                                                                                    <h5>Демографія</h5>
                                                                                    <ul>
                                                                                        {Object.entries(demo).map(([key, value], index) => (
                                                                                            <li key={index}><strong>{key}:</strong> {value as string}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            );
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Failed to render subproject demographics:', error);
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className={styles.audienceActions}>
                                                            <button 
                                                                className="btn btn-primary"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleUseInGenerator(audience.id);
                                                                }}
                                                                type="button"
                                                            >
                                                                Використати для генерації
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={styles.emptyState}>
                                                <p>Для цього під-проекту не знайдено цільових аудиторій</p>
                                                <p>Перейдіть до редагування та запустіть аналіз</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}