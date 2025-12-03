'use client';

import { useState, useRef } from 'react';
import styles from './CreateProjectModal.module.css';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ProjectData) => void;
}

export interface ProjectData {
    name: string;
    url: string;
    icon?: File | null;
}

export default function CreateProjectModal({ isOpen, onClose, onSubmit }: CreateProjectModalProps) {
    const [projectName, setProjectName] = useState('');
    const [projectUrl, setProjectUrl] = useState('');
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

        onSubmit({
            name: projectName,
            url: projectUrl,
            icon: iconFile,
        });

        // Reset form
        setProjectName('');
        setProjectUrl('');
        setIconFile(null);
        setIconPreview(null);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Створити новий проект</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
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

                    {/* Submit Button */}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={onClose}
                        >
                            Скасувати
                        </button>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                        >
                            Створити проект
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
