'use client';

import { useState, useRef } from 'react';
import { TargetAudience } from '@/lib/supabase';
import { SIZE_OPTIONS } from '@/lib/prompts';
import styles from './BottomGenerationBar.module.css';

interface BottomGenerationBarProps {
    availableProjects: any[];
    currentProject: { id: string; analysis: any } | null;
    onProjectSelect: (projectId: string) => void;
    onGenerate: (params: any) => void;
}

export default function BottomGenerationBar({
    availableProjects,
    currentProject,
    onProjectSelect,
    onGenerate,
}: BottomGenerationBarProps) {
    const [selectedAudience, setSelectedAudience] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('instagram-square');
    const [quantity, setQuantity] = useState<number>(1);
    const [templateFiles, setTemplateFiles] = useState<File[]>([]);
    const [logoFiles, setLogoFiles] = useState<File[]>([]);
    const [personFiles, setPersonFiles] = useState<File[]>([]);

    const templateInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const personInputRef = useRef<HTMLInputElement>(null);

    const targetAudiences = currentProject?.analysis?.target_audiences || [];

    const handleFileSelect = (files: FileList | null, type: 'template' | 'logo' | 'person') => {
        if (!files) return;
        const fileArray = Array.from(files);
        
        if (type === 'template') setTemplateFiles(fileArray);
        if (type === 'logo') setLogoFiles(fileArray);
        if (type === 'person') setPersonFiles(fileArray);
    };

    const handleGenerate = () => {
        if (!currentProject) {
            alert('Оберіть проект');
            return;
        }
        if (!selectedAudience) {
            alert('Оберіть цільову аудиторію');
            return;
        }

        onGenerate({
            projectId: currentProject.id,
            audienceId: selectedAudience,
            size: selectedSize,
            quantity,
            templateFiles,
            logoFiles,
            personFiles,
        });
    };

    return (
        <div className={styles.bottomBar}>
            <div className={styles.controls}>
                {/* Template Upload */}
                <div className={styles.control}>
                    <input
                        ref={templateInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files, 'template')}
                        style={{ display: 'none' }}
                    />
                    <button 
                        className={styles.uploadBtn}
                        onClick={() => templateInputRef.current?.click()}
                        title="Шаблон / Фон"
                    >
                        📎 {templateFiles.length > 0 && `(${templateFiles.length})`}
                    </button>
                    <span className={styles.label}>Шаблон</span>
                </div>

                {/* Logo Upload */}
                <div className={styles.control}>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files, 'logo')}
                        style={{ display: 'none' }}
                    />
                    <button 
                        className={styles.uploadBtn}
                        onClick={() => logoInputRef.current?.click()}
                        title="Логотип"
                    >
                        🏢 {logoFiles.length > 0 && `(${logoFiles.length})`}
                    </button>
                    <span className={styles.label}>Лого</span>
                </div>

                {/* Person/Product Upload */}
                <div className={styles.control}>
                    <input
                        ref={personInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files, 'person')}
                        style={{ display: 'none' }}
                    />
                    <button 
                        className={styles.uploadBtn}
                        onClick={() => personInputRef.current?.click()}
                        title="Людина / Товар"
                    >
                        👤 {personFiles.length > 0 && `(${personFiles.length})`}
                    </button>
                    <span className={styles.label}>Людина</span>
                </div>

                <div className={styles.divider}></div>

                {/* Project Select */}
                <div className={styles.control}>
                    <select
                        value={currentProject?.id || ''}
                        onChange={(e) => onProjectSelect(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Проект</option>
                        {availableProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name || 'Без назви'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Target Audience Select */}
                <div className={styles.control}>
                    <select
                        value={selectedAudience}
                        onChange={(e) => setSelectedAudience(e.target.value)}
                        className={styles.select}
                        disabled={!currentProject}
                    >
                        <option value="">ЦА</option>
                        {targetAudiences.map((audience: TargetAudience) => (
                            <option key={audience.id} value={audience.id}>
                                {audience.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Size Select */}
                <div className={styles.control}>
                    <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className={styles.select}
                    >
                        {SIZE_OPTIONS.map((size) => (
                            <option key={size.id} value={size.id}>
                                {size.dimensions}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quantity */}
                <div className={styles.control}>
                    <input
                        type="number"
                        min="1"
                        max="4"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className={styles.numberInput}
                    />
                    <span className={styles.label}>шт</span>
                </div>

                {/* Generate Button */}
                <button 
                    className={styles.generateBtn}
                    onClick={handleGenerate}
                    disabled={!currentProject || !selectedAudience}
                >
                    ✨ Генерувати
                </button>
            </div>
        </div>
    );
}
