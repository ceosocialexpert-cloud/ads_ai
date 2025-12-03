'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Subproject } from '@/lib/supabase';
import styles from '../new/page.module.css';

export default function EditSubprojectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;
    const subprojectId = params.subprojectId as string;

    const [loading, setLoading] = useState(true);
    const [subproject, setSubproject] = useState<Subproject | null>(null);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'webinar' | 'landing' | 'campaign'>('webinar');
    const [language, setLanguage] = useState('uk');
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        loadSubproject();
    }, [subprojectId]);

    const loadSubproject = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/subprojects?projectId=${projectId}&subprojectId=${subprojectId}`);
            const data = await response.json();

            if (data.success) {
                setSubproject(data.subproject);
                setName(data.subproject.name);
                setUrl(data.subproject.url);
                setDescription(data.subproject.description || '');
                setType(data.subproject.type);
                setLanguage(data.subproject.language || 'uk');
            } else {
                alert('❌ Не вдалося завантажити під-проект');
            }
        } catch (error) {
            console.error('Load error:', error);
            alert('❌ Помилка завантаження');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const response = await fetch('/api/subprojects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subprojectId,
                    name,
                    url,
                    description,
                    type,
                    language,
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Зміни збережено!');
                loadSubproject();
            } else {
                alert('❌ Помилка: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Помилка збереження');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunAnalysis = async () => {
        if (!confirm('Запустити аналіз під-проекту та визначити цільові аудиторії?')) {
            return;
        }

        try {
            setIsAnalyzing(true);
            const response = await fetch('/api/analyze-subproject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subprojectId }),
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Аналіз завершено успішно!');
                loadSubproject();
            } else {
                alert('❌ Помилка аналізу: ' + (data.error || 'Невідома помилка'));
            }
        } catch (error) {
            console.error('Analysis error:', error);
            alert('❌ Помилка запуску аналізу');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Ви дійсно хочете видалити під-проект "${name}"? Це незворотна дія.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/subprojects?subprojectId=${subprojectId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Під-проект видалено');
                router.push(`/projects/${projectId}/settings`);
            } else {
                alert('❌ Помилка видалення: ' + data.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('❌ Помилка видалення');
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <p>Завантаження...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>✏️ Редагування під-проекту</h1>
                    <nav className={styles.nav}>
                        <Link href={`/projects/${projectId}/settings`} className="btn btn-secondary">
                            ← Назад до налаштувань
                        </Link>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.section}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2>Інформація про під-проект</h2>
                        <button
                            className="btn btn-primary"
                            onClick={handleRunAnalysis}
                            disabled={isAnalyzing}
                            type="button"
                        >
                            {isAnalyzing ? '🔄 Аналізую...' : '🎯 Запустити аналіз'}
                        </button>
                    </div>

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
                                Мова, якою буде виконуватися аналіз цільової аудиторії
                            </small>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleDelete}
                                style={{ background: '#ef4444', color: 'white', borderColor: '#ef4444' }}
                            >
                                🗑️ Видалити під-проект
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSaving}
                            >
                                {isSaving ? '💾 Збереження...' : '💾 Зберегти зміни'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Target Audiences Section */}
                {subproject && subproject.target_audiences && subproject.target_audiences.length > 0 && (
                    <section className={styles.section}>
                        <h2>Цільові аудиторії ({subproject.target_audiences.length})</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            {subproject.target_audiences.map((audience) => (
                                <div key={audience.id} style={{ 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '12px', 
                                    padding: '1.5rem',
                                    background: 'var(--background-light)'
                                }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{audience.name}</h3>
                                    <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
                                        {audience.description}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <strong>Болі:</strong>
                                            <ul style={{ marginTop: '0.5rem' }}>
                                                {audience.pain_points.map((pain, i) => (
                                                    <li key={i}>{pain}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <strong>Потреби:</strong>
                                            <ul style={{ marginTop: '0.5rem' }}>
                                                {audience.needs.map((need, i) => (
                                                    <li key={i}>{need}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
