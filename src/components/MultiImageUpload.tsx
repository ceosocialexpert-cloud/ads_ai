'use client';

import { useState, useRef } from 'react';
import styles from './MultiImageUpload.module.css';

export interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    base64: string;
    type: 'style' | 'logo' | 'subject';
}

interface MultiImageUploadProps {
    onImagesChange: (images: UploadedImage[]) => void;
    maxImages?: number;
}

export default function MultiImageUpload({ onImagesChange, maxImages = 14 }: MultiImageUploadProps) {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        processFiles(files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        processFiles(files);
    };

    const processFiles = async (files: File[]) => {
        const remainingSlots = maxImages - images.length;
        const filesToProcess = files.slice(0, remainingSlots);

        const newImages: UploadedImage[] = [];

        for (const file of filesToProcess) {
            const preview = await readFileAsDataURL(file);
            const base64 = preview.split(',')[1];

            newImages.push({
                id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                file,
                preview,
                base64,
                type: 'style', // Default type
            });
        }

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange(updatedImages);
    };

    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (id: string) => {
        const updatedImages = images.filter(img => img.id !== id);
        setImages(updatedImages);
        onImagesChange(updatedImages);
    };

    const updateImageType = (id: string, type: 'style' | 'logo' | 'subject') => {
        const updatedImages = images.map(img =>
            img.id === id ? { ...img, type } : img
        );
        setImages(updatedImages);
        onImagesChange(updatedImages);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <label>Референсні зображення ({images.length}/{maxImages})</label>
                <p className={styles.hint}>
                    Додайте логотипи, стилі, людей або продукти для генерації
                </p>
            </div>

            {/* Upload Zone */}
            {images.length < maxImages && (
                <div
                    className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className={styles.placeholder}>
                        <div className={styles.icon}>📁</div>
                        <p>Перетягніть зображення або натисніть для вибору</p>
                        <p className={styles.limit}>До {maxImages - images.length} зображень</p>
                    </div>
                </div>
            )}

            {/* Image Grid */}
            {images.length > 0 && (
                <div className={styles.imageGrid}>
                    {images.map((image) => (
                        <div key={image.id} className={styles.imageCard}>
                            <div className={styles.imagePreview}>
                                <img src={image.preview} alt="Reference" />
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => removeImage(image.id)}
                                    title="Видалити"
                                >
                                    ✕
                                </button>
                            </div>
                            <select
                                value={image.type}
                                onChange={(e) => updateImageType(image.id, e.target.value as any)}
                                className={styles.typeSelector}
                            >
                                <option value="style">🎨 Стиль</option>
                                <option value="logo">🏷️ Логотип</option>
                                <option value="subject">👤 Об'єкт</option>
                            </select>
                        </div>
                    ))}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
        </div>
    );
}
