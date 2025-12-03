'use client';

import styles from './ConfirmDeleteModal.module.css';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    projectName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDeleteModal({
    isOpen,
    projectName,
    onConfirm,
    onCancel,
}: ConfirmDeleteModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.backdrop} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.icon}>⚠️</div>
                <h2>Видалити проект?</h2>
                <p className={styles.message}>
                    Ви дійсно хочете видалити проект <strong>"{projectName}"</strong>?
                </p>
                <p className={styles.warning}>
                    Ця дія незворотна. Всі дані проекту та цільові аудиторії будуть видалені назавжди.
                </p>

                <div className={styles.actions}>
                    <button
                        className={styles.cancelBtn}
                        onClick={onCancel}
                        type="button"
                    >
                        Скасувати
                    </button>
                    <button
                        className={styles.deleteBtn}
                        onClick={onConfirm}
                        type="button"
                    >
                        🗑️ Так, видалити
                    </button>
                </div>
            </div>
        </div>
    );
}
