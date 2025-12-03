'use client';

import { useState } from 'react';
import styles from './AnalysisConfirmModal.module.css';

interface AnalysisConfirmModalProps {
    isOpen: boolean;
    projectName: string;
    projectUrl: string;
    onConfirm: () => void;
    onSkip: () => void;
}

export default function AnalysisConfirmModal({
    isOpen,
    projectName,
    projectUrl,
    onConfirm,
    onSkip,
}: AnalysisConfirmModalProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setIsAnalyzing(true);
        onConfirm();
    };

    return (
        <div className={styles.backdrop}>
            <div className={styles.modal}>
                <div className={styles.icon}>🎯</div>
                <h2>Запустити аналіз проекту?</h2>
                <p className={styles.description}>
                    Проект <strong>"{projectName}"</strong> успішно створено!
                </p>
                <p className={styles.question}>
                    Бажаєте запустити аналіз сайту та визначити цільові аудиторії?
                </p>
                
                <div className={styles.info}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>🌐 Сайт:</span>
                        <span className={styles.value}>{projectUrl}</span>
                    </div>
                </div>

                <div className={styles.benefits}>
                    <p className={styles.benefitsTitle}>Що буде проаналізовано:</p>
                    <ul>
                        <li>✅ Опис продукту/послуги</li>
                        <li>✅ Ключові особливості</li>
                        <li>✅ Сегменти цільової аудиторії</li>
                        <li>✅ Болі та потреби кожного сегменту</li>
                    </ul>
                </div>

                <div className={styles.actions}>
                    <button
                        className={styles.skipBtn}
                        onClick={onSkip}
                        disabled={isAnalyzing}
                    >
                        Пропустити
                    </button>
                    <button
                        className={styles.confirmBtn}
                        onClick={handleConfirm}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <>
                                <div className="spinner" />
                                Аналізую...
                            </>
                        ) : (
                            '🚀 Запустити аналіз'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
