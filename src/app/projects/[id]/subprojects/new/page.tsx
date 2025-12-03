'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSessionId } from '@/lib/session';
import styles from './page.module.css';

export default function NewSubprojectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;
    const sessionId = getSessionId();

    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'webinar' | 'landing' | 'campaign'>('webinar');
    const [language, setLanguage] = useState('uk');
    const [isSaving, setIsSaving] = useState(false);
    const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
    const [createdSubprojectId, setCreatedSubprojectId] = useState<string | null>(null);

    // Load parent project language
    useEffect(() => {
        const loadProjectLanguage = async () => {
            try {
                const response = await fetch(`/api/projects?sessionId=${sessionId}&projectId=${projectId}`);
                const data = await response.json();
                if (data.success && data.project.language) {
                    setLanguage(data.project.language);
                }
            } catch (error) {
                console.error('Failed to load project language:', error);
            }
        };
        loadProjectLanguage();
    }, [projectId, sessionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const response = await fetch('/api/subprojects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    name,
                    url,
                    description,
                    type,
                    language,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setCreatedSubprojectId(data.subproject.id);
                setShowAnalysisPopup(true);
            } else {
                alert('❌ Помилка: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Помилка створення під-проекту');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunAnalysis = async () => {
        if (!createdSubprojectId) return;

        setShowAnalysisPopup(false);
        router.push(`/projects/${projectId}`);

        // Trigger analysis in background
        try {
            const response = await fetch('/api/analyze-subproject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subprojectId: createdSubprojectId }),
            });

            const data = await response.json();
            if (!data.success) {
                console.error('Analysis failed:', data.error);
            }
        } catch (error) {
            console.error('Analysis error:', error);
        }
    };

    const handleSkipAnalysis = () => {
        setShowAnalysisPopup(false);
        router.push(`/projects/${projectId}`);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>➕ Новий під-проект</h1>
                    <nav className={styles.nav}>
                        <Link href={`/projects/${projectId}/settings`} className="btn btn-secondary">
                            ← Назад до налаштувань
                        </Link>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.section}>
                    <h2>Інформація про під-проект</h2>
                    <p className={styles.hint}>
                        Під-проект — це окрема сторінка в рамках основного проекту (вебінар, лендінг, кампанія) 
                        з власним аналізом та цільовою аудиторією.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Type */}
                        <div className={styles.formGroup}>
                            <label>Тип під-проекту *</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                required
                            >
                                <option value="webinar">🎥 Вебінар</option>
                                <option value="landing">📄 Лендінг</option>
                                <option value="campaign">📢 Рекламна кампанія</option>
                            </select>
                        </div>

                        {/* Name */}
                        <div className={styles.formGroup}>
                            <label>Назва під-проекту *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Наприклад: Вебінар про профорієнтацію"
                                required
                            />
                        </div>

                        {/* URL */}
                        <div className={styles.formGroup}>
                            <label>URL адреса *</label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/webinar-proforientaciya"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className={styles.formGroup}>
                            <label>Опис (необов'язково)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Короткий опис того, про що цей під-проект..."
                                rows={3}
                            />
                        </div>

                        {/* Language */}
                        <div className={styles.formGroup}>
                            <label>Мова аналізу *</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                required
                            >
                                <option value="uk">🇺🇦 Українська</option>
                                <option value="ru">🇷🇺 Російська</option>
                                <option value="en">🇬🇧 Англійська</option>
                            </select>
                            <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
                                Мова за замовчуванням успадковується від основного проекту
                            </small>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push(`/projects/${projectId}/settings`)}
                            >
                                Скасувати
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSaving}
                            >
                                {isSaving ? '💾 Створення...' : '✅ Створити під-проект'}
                            </button>
                        </div>
                    </form>
                </section>
            </main>

            {/* Analysis Confirmation Popup */}
            {showAnalysisPopup && (
                <div className={styles.popupOverlay}>
                    <div className={styles.popupContent}>
                        <h3>🎯 Запустити аналіз під-проекту?</h3>
                        <p>Під-проект успішно створено! Бажаєте зараз проаналізувати сайт та визначити цільові аудиторії?</p>
                        <div className={styles.popupActions}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleSkipAnalysis}
                            >
                                Пропустити
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRunAnalysis}
                            >
                                🚀 Запустити аналіз
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
