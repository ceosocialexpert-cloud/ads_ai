'use client';

import { GeneratedCreative } from '@/lib/supabase';
import styles from './CreativeCard.module.css';

interface CreativeCardProps {
    creative: GeneratedCreative;
    onClick: () => void;
}

export default function CreativeCard({ creative, onClick }: CreativeCardProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.imageContainer}>
                <img src={creative.image_url} alt={`Creative ${creative.format}`} loading="lazy" />
                <div className={styles.overlay}>
                    <button className="btn btn-secondary btn-sm">👁️ Переглянути</button>
                </div>
            </div>

            <div className={styles.info}>
                <div className={styles.meta}>
                    <span className={styles.format}>{creative.format}</span>
                    <span className={styles.size}>{creative.size}</span>
                </div>

                {creative.target_audience && (
                    <div className={styles.audience}>
                        <span className={styles.label}>ЦА:</span>
                        <span className={styles.value}>{creative.target_audience}</span>
                    </div>
                )}

                <div className={styles.date}>{formatDate(creative.created_at)}</div>
            </div>
        </div>
    );
}
