'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSessionId } from '@/lib/session';
import { Project } from '@/lib/supabase';
import styles from './page.module.css';

export default function ProjectSettingsPage() {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const params = useParams();
    const sessionId = getSessionId();
    const projectId = params.id as string;

    // Form states
    const [projectName, setProjectName] = useState('');
    const [projectUrl, setProjectUrl] = useState('');
    const [projectLanguage, setProjectLanguage] = useState('uk');
    const [projectIcon, setProjectIcon] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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
                setProjectName(data.project.name || '');
                setProjectUrl(data.project.url || '');
                setProjectLanguage(data.project.language || 'uk');
                if (data.project.screenshot_url) {
                    setIconPreview(data.project.screenshot_url);
                }
            }
        } catch (err) {
            console.error('Failed to load project:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProjectIcon(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setIconPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Convert icon to base64 if changed
            let iconBase64 = null;
            if (projectIcon) {
                iconBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(projectIcon);
                });
            }

            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: projectName,
                    url: projectUrl,
                    language: projectLanguage,
                    icon: iconBase64,
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Налаштування збережено!');
                loadProject();
            } else {
                alert('❌ Помилка збереження: ' + data.error);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('❌ Помилка збереження');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className="spinner"></div>
                    <span>Завантаження...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>⚙️ Налаштування проекту</h1>
                    <nav className={styles.nav}>
                        <Link href={`/projects/${projectId}`} className="btn btn-secondary">
                            ← Назад до проекту
                        </Link>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                {/* Main Project Settings */}
                <section className={styles.section}>
                    <h2>Основні налаштування</h2>
                    <form onSubmit={handleSaveProject} className={styles.form}>
                        {/* Icon Upload */}
                        <div className={styles.formGroup}>
                            <label>Іконка проекту</label>
                            <div className={styles.iconUpload}>
                                {iconPreview ? (
                                    <div className={styles.iconPreviewContainer}>
                                        <img src={iconPreview} alt="Project icon" className={styles.iconPreview} />
                                        <div className={styles.iconActions}>
                                            <label className={styles.iconActionBtn}>
                                                🔄 Замінити
                                                <input type="file" accept="image/*" onChange={handleIconChange} style={{ display: 'none' }} />
                                            </label>
                                            <button
                                                type="button"
                                                className={styles.iconActionBtn}
                                                onClick={() => {
                                                    setIconPreview(null);
                                                    setProjectIcon(null);
                                                }}
                                            >
                                                🗑️ Видалити
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className={styles.iconUploadLabel}>
                                        <div className={styles.iconUploadPlaceholder}>
                                            <span>📷</span>
                                            <p>Натисніть для завантаження</p>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleIconChange} style={{ display: 'none' }} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Project Name */}
                        <div className={styles.formGroup}>
                            <label>Назва проекту *</label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Наприклад: Academy Ocean"
                                required
                            />
                        </div>

                        {/* Project URL */}
                        <div className={styles.formGroup}>
                            <label>Основний сайт проекту *</label>
                            <input
                                type="url"
                                value={projectUrl}
                                onChange={(e) => setProjectUrl(e.target.value)}
                                placeholder="https://example.com"
                                required
                            />
                        </div>

                        {/* Language */}
                        <div className={styles.formGroup}>
                            <label>Мова аналізу *</label>
                            <select
                                value={projectLanguage}
                                onChange={(e) => setProjectLanguage(e.target.value)}
                                required
                            >
                                <option value="uk">🇺🇦 Українська</option>
                                <option value="ru">🇷🇺 Російська</option>
                                <option value="en">🇬🇧 Англійська</option>
                            </select>
                            <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
                                Мова, якою буде виконуватися аналіз цільової аудиторії
                            </small>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? '💾 Збереження...' : '💾 Зберегти зміни'}
                        </button>
                    </form>
                </section>
            </main>
        </div>
    );
}
