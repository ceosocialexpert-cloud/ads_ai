'use client';

import { useState, useRef } from 'react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
    onFileSelect: (base64: string, screenshotUrl?: string) => void;
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
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

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const result = e.target?.result as string;
            setPreview(result);

            // Convert to base64 without data URL prefix
            const base64 = result.split(',')[1];
            onFileSelect(base64, result);
        };

        reader.readAsDataURL(file);
    };

    return (
        <div className={styles.container}>
            <div
                className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                {preview ? (
                    <div className={styles.preview}>
                        <img src={preview} alt="Preview" />
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreview(null);
                            }}
                        >
                            Змінити
                        </button>
                    </div>
                ) : (
                    <div className={styles.placeholder}>
                        <div className={styles.icon}>📸</div>
                        <p>Перетягніть зображення сюди</p>
                        <p className={styles.or}>або</p>
                        <button className="btn btn-secondary">Оберіть файл</button>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
        </div>
    );
}
