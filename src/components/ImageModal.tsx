'use client';

import { useEffect } from 'react';
import { GeneratedCreative } from '@/lib/supabase';
import styles from './ImageModal.module.css';

interface ImageModalProps {
    creative: GeneratedCreative | null;
    onClose: () => void;
}

export default function ImageModal({ creative, onClose }: ImageModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (creative) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [creative, onClose]);

    if (!creative) return null;

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    ✕
                </button>

                <div className={styles.imageContainer}>
                    <img src={creative.image_url} alt={`Creative ${creative.format}`} />
                </div>

                <div className={styles.details}>
                    <div className={styles.row}>
                        <span className={styles.label}>Формат:</span>
                        <span className={styles.value}>{creative.format}</span>
                    </div>

                    <div className={styles.row}>
                        <span className={styles.label}>Розмір:</span>
                        <span className={styles.value}>{creative.size}</span>
                    </div>

                    {creative.target_audience && (
                        <div className={styles.row}>
                            <span className={styles.label}>Цільова аудиторія:</span>
                            <span className={styles.value}>{creative.target_audience}</span>
                        </div>
                    )}

                    {creative.prompt_used && (
                        <div className={styles.promptSection}>
                            <span className={styles.label}>Промпт:</span>
                            <p className={styles.prompt}>{creative.prompt_used}</p>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <a
                            href={creative.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            Відкрити в новій вкладці
                        </a>
                        <a
                            href={creative.image_url}
                            download
                            className="btn btn-secondary"
                        >
                            Завантажити
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
