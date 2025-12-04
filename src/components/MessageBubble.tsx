'use client';

import { useState } from 'react';
import styles from './MessageBubble.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    imageUrl?: string; // Add support for images
    metadata?: {
        type?: string;
        image?: string;
        images?: string[];
        size?: string;
        creativeId?: string;
        [key: string]: any;
    };
    created_at: string;
}

interface MessageBubbleProps {
    message: Message;
    onQuickReply?: (reply: string) => void;
    onResizeImage?: (imageBase64: string, currentSize: string, targetSize: string) => void;
}

export default function MessageBubble({ message, onQuickReply, onResizeImage }: MessageBubbleProps) {
    const { role, content, imageUrl, metadata } = message;
    const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);
    
    // Check if this is a generated creative message with multiple images
    const hasGeneratedImages = metadata?.type === 'generated_creative' && metadata?.images;
    const images = hasGeneratedImages && Array.isArray(metadata.images) 
        ? metadata.images.map((img: string) => {
            // Якщо це вже URL (починається з http), використовуємо як є
            if (img.startsWith('http')) {
                return img;
            }
            // Якщо це base64, додаємо префікс
            return `data:image/png;base64,${img}`;
        })
        : imageUrl ? [imageUrl] : [];
    
    // Get original size from metadata
    const originalSize = metadata?.size || '1080x1080';
    
    // Determine target size based on current size
    const getTargetSize = (currentSize: string) => {
        if (currentSize.includes('1920') || currentSize.includes('9:16')) {
            return '1080x1080'; // 9:16 -> 1:1
        }
        return '1080x1920'; // 1:1 -> 9:16
    };
    
    const handleDownload = (imageData: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `creative-${Date.now()}-${index + 1}.png`;
        link.click();
    };
    
    const handleResize = async (imageData: string, index: number) => {
        if (!onResizeImage) return;
        
        const targetSize = getTargetSize(originalSize);
        
        let base64Data: string;
        
        // Якщо це URL (починається з http), завантажуємо і конвертуємо в base64
        if (imageData.startsWith('http')) {
            try {
                // Завантажуємо зображення
                const response = await fetch(imageData);
                const blob = await response.blob();
                
                // Конвертуємо blob в base64
                base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        // Видаляємо префікс "data:image/...;base64,"
                        const result = (reader.result as string).split(',')[1];
                        resolve(result);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('Failed to load image for resize:', error);
                return;
            }
        } else {
            // Якщо це вже base64, просто видаляємо префікс
            base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        }
        
        onResizeImage(base64Data, originalSize, targetSize);
    };
    
    // Check if message asks for confirmation about creating project
    const isProjectConfirmation = role === 'assistant' && content.includes('Хочете створити новий проект');

    return (
        <div className={`${styles.bubble} ${styles[role]}`}>
            <div className={styles.content}>
                {content}
                {images.length > 0 && (
                    <div className={styles.imageContainer}>
                        {images.map((img: string, index: number) => (
                            <div 
                                key={index}
                                className={styles.imageWrapper}
                                onMouseEnter={() => setHoveredImageIndex(index)}
                                onMouseLeave={() => setHoveredImageIndex(null)}
                            >
                                <img 
                                    src={img} 
                                    alt={`Згенерований креатив ${index + 1}`}
                                    className={styles.generatedImage}
                                />
                                {hoveredImageIndex === index && (
                                    <div className={styles.imageActions}>
                                        <button 
                                            className={styles.actionBtn}
                                            onClick={() => handleDownload(img, index)}
                                            title="Скачати"
                                        >
                                            ⬇️
                                        </button>
                                        <button 
                                            className={styles.actionBtn}
                                            onClick={() => handleResize(img, index)}
                                            title={`Адаптувати до ${getTargetSize(originalSize)}`}
                                        >
                                            🔄
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {isProjectConfirmation && onQuickReply && (
                    <div className={styles.quickReplies}>
                        <button 
                            className={`${styles.quickReplyBtn} ${styles.yes}`}
                            onClick={() => onQuickReply('так')}
                        >
                            ✓ Так
                        </button>
                        <button 
                            className={`${styles.quickReplyBtn} ${styles.no}`}
                            onClick={() => onQuickReply('ні')}
                        >
                            ✗ Ні
                        </button>
                    </div>
                )}
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
