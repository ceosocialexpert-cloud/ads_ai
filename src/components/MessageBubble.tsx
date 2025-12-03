'use client';

import styles from './MessageBubble.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

interface MessageBubbleProps {
    message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const { role, content } = message;

    return (
        <div className={`${styles.bubble} ${styles[role]}`}>
            <div className={styles.content}>
                {content}
            </div>
            <div className={styles.timestamp}>
                {new Date(message.created_at).toLocaleTimeString('uk-UA', {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </div>
        </div>
    );
}
