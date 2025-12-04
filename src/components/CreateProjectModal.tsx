'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './CreateProjectModal.module.css';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ProjectData) => void;
    initialUrl?: string;
}

export interface ProjectData {
    name: string;
    url: string;
    language?: string;
    icon?: File | null;
}

export default function CreateProjectModal({ isOpen, onClose, onSubmit, initialUrl = '' }: CreateProjectModalProps) {
    const [projectName, setProjectName] = useState('');
    const [projectUrl, setProjectUrl] = useState('');
    const [projectLanguage, setProjectLanguage] = useState('uk');
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update URL when modal opens with initialUrl
    useEffect(() => {
        if (isOpen && initialUrl) {
            setProjectUrl(initialUrl);
        }
    }, [isOpen, initialUrl]);

    if (!isOpen) return null;

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setIconPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveIcon = () => {
        setIconFile(null);
        setIconPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!projectName.trim()) {
            alert('Введіть назву проекту');
            return;
        }
        
        if (!projectUrl.trim()) {
            alert('Введіть посилання на сайт');
            return;
        }

        setIsSubmitting(true);
        
        onSubmit({
            name: projectName,
            url: projectUrl,
            language: projectLanguage,
            icon: iconFile,
        });

        // Reset form AFTER successful submission (parent will close modal)
        setTimeout(() => {
            setProjectName('');
            setProjectUrl('');
            setProjectLanguage('uk');
            setIconFile(null);
            setIconPreview(null);
            setIsSubmitting(false);
        }, 500);
    };

    const handleClose = () => {
        // Reset form when closing
        setProjectName('');
        setProjectUrl('');
        setProjectLanguage('uk');
        setIconFile(null);
        setIconPreview(null);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Створити новий проект</h2>
                    <button className={styles.closeBtn} onClick={handleClose}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Icon Upload */}
                    <div className={styles.iconSection}>
                        <label className={styles.label}>Іконка проекту</label>
                        <div className={styles.iconContainer}>
                            {iconPreview ? (
                                <div className={styles.iconPreview}>
                                    <img src={iconPreview} alt="Project icon" />
                                    <div className={styles.iconActions}>
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Замінити"
                                        >
                                            🔄
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            onClick={handleRemoveIcon}
                                            title="Видалити"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.iconUploadBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <span className={styles.uploadIcon}>📷</span>
                                    <span className={styles.uploadText}>Додати іконку</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleIconUpload}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Project Name */}
                    <div className={styles.field}>
                        <label htmlFor="project-name" className={styles.label}>
                            Назва проекту *
                        </label>
                        <input
                            id="project-name"
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Введіть назву проекту..."
                            className={styles.input}
                            required
                        />
                    </div>

                    {/* Project URL */}
                    <div className={styles.field}>
                        <label htmlFor="project-url" className={styles.label}>
                            Посилання на сайт *
                        </label>
                        <input
                            id="project-url"
                            type="url"
                            value={projectUrl}
                            onChange={(e) => setProjectUrl(e.target.value)}
                            placeholder="https://example.com"
                            className={styles.input}
                            required
                        />
                    </div>

                    {/* Language Selection */}
                    <div className={styles.field}>
                        <label htmlFor="project-language" className={styles.label}>
                            Мова аналізу *
                        </label>
                        <select
                            id="project-language"
                            value={projectLanguage}
                            onChange={(e) => setProjectLanguage(e.target.value)}
                            className={styles.input}
                            required
                        >
                            <option value="uk">🇺🇦 Українська</option>
                            <option value="ru">🇷🇺 Російська</option>
                            <option value="en">🇬🇧 Англійська</option>
                        </select>
                        <small style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                            Мова, якою буде виконуватися аналіз цільової аудиторії
                        </small>
                    </div>

                    {/* Submit Button */}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={handleClose}
                        >
                            Скасувати
                        </button>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Створюється...' : 'Створити проект'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
