'use client';

import { useState, useEffect } from 'react';
import { TargetAudience } from '@/lib/supabase';
import { CREATIVE_FORMATS, SIZE_OPTIONS } from '@/lib/prompts';
import { getSessionId } from '@/lib/session';
import MultiImageUpload, { UploadedImage } from './MultiImageUpload';
import styles from './GenerationSettings.module.css';

interface GenerationSettingsProps {
    projectId: string;
    targetAudiences: TargetAudience[];
    onGenerationComplete?: (creatives: any[]) => void;
}

export default function GenerationSettings({
    projectId,
    targetAudiences,
    onGenerationComplete,
}: GenerationSettingsProps) {
    const [selectedAudience, setSelectedAudience] = useState<string>('');
    const [selectedFormat, setSelectedFormat] = useState<string>('product-demo');
    const [selectedSize, setSelectedSize] = useState<string>('instagram-square');
    const [quantity, setQuantity] = useState<number>(1);
    const [templateImages, setTemplateImages] = useState<UploadedImage[]>([]);
    const [personProductImages, setPersonProductImages] = useState<UploadedImage[]>([]);
    const [logoImages, setLogoImages] = useState<UploadedImage[]>([]);
    const [referenceDescription, setReferenceDescription] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);

    const sessionId = getSessionId();

    // Set first audience as default when targetAudiences change
    useEffect(() => {
        if (targetAudiences && targetAudiences.length > 0 && !selectedAudience) {
            setSelectedAudience(targetAudiences[0].id);
        }
    }, [targetAudiences, selectedAudience]);

    const handleGenerate = async () => {
        if (!selectedAudience || !selectedFormat || !selectedSize) {
            alert('Будь ласка, оберіть всі параметри');
            return;
        }

        setIsGenerating(true);
        setGeneratedImages([]);

        try {
            // Find selected audience details
            const audienceDetails = targetAudiences.find(a => a.id === selectedAudience);
            
            // Prepare reference images data by type
            const referenceImagesData = {
                template: templateImages.map(img => ({
                    base64: img.base64,
                    type: img.type,
                })),
                personProduct: personProductImages.map(img => ({
                    base64: img.base64,
                    type: img.type,
                })),
                logo: logoImages.map(img => ({
                    base64: img.base64,
                    type: img.type,
                })),
            };

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    projectId,
                    targetAudience: selectedAudience,
                    targetAudienceDetails: audienceDetails, // Send full audience details
                    format: selectedFormat,
                    size: selectedSize,
                    quantity,
                    referenceImages: referenceImagesData,
                    referenceDescription: referenceDescription || undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setGeneratedImages(data.imageUrls);

                // Show success message with timestamp
                const now = new Date().toLocaleTimeString('uk-UA');
                alert(`🎉 НОВІ креативи згенеровано о ${now}!

✅ Кількість: ${data.imageUrls.length}
📍 Результати показані НИЖЧЕ на цій сторінці
🖼️ Також збережено в Галереї`);

                if (onGenerationComplete) {
                    onGenerationComplete(data.creatives);
                }

                // Scroll to results
                setTimeout(() => {
                    const resultsElement = document.getElementById('generation-results');
                    if (resultsElement) {
                        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            } else {
                alert('Помилка генерації: ' + (data.error || 'Невідома помилка'));
            }
        } catch (error) {
            console.error('Generation error:', error);
            alert('Помилка генерації креативів');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>⚙️ Налаштування генерації</h3>
                <p>Оберіть параметри для створення креативів</p>
            </div>

            <div className={styles.settings}>
                {/* Target Audience Selection */}
                <div className={styles.section}>
                    <label>Цільова аудиторія</label>
                    <select
                        value={selectedAudience}
                        onChange={(e) => setSelectedAudience(e.target.value)}
                        disabled={isGenerating}
                    >
                        <option value="">Оберіть сегмент...</option>
                        {targetAudiences.map((audience, index) => (
                            <option key={audience.id || index} value={audience.id}>
                                {audience.name}
                            </option>
                        ))}
                    </select>

                    {selectedAudience && (
                        <div className={styles.audienceInfo}>
                            {targetAudiences
                                .filter((a) => a.id === selectedAudience)
                                .map((audience, index) => (
                                    <div key={audience.id || index} className={styles.audienceDetails}>
                                        <p className={styles.description}>{audience.description}</p>
                                        <div className={styles.tags}>
                                            <div className={styles.tagGroup}>
                                                <strong>Болі:</strong>
                                                {audience.pain_points.map((point, i) => (
                                                    <span key={i} className={styles.tag}>
                                                        {point}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className={styles.tagGroup}>
                                                <strong>Потреби:</strong>
                                                {audience.needs.map((need, i) => (
                                                    <span key={i} className={styles.tag}>
                                                        {need}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Format Selection */}
                <div className={styles.section}>
                    <label>Формат креативу</label>
                    <div className={styles.formatGrid}>
                        {CREATIVE_FORMATS.map((format) => (
                            <button
                                key={format.id}
                                className={`${styles.formatCard} ${selectedFormat === format.id ? styles.selected : ''
                                    }`}
                                onClick={() => setSelectedFormat(format.id)}
                                disabled={isGenerating}
                            >
                                <div className={styles.formatName}>{format.name}</div>
                                <div className={styles.formatDesc}>{format.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Size Selection */}
                <div className={styles.section}>
                    <label>Розмір</label>
                    <div className={styles.sizeGrid}>
                        {SIZE_OPTIONS.map((size) => (
                            <button
                                key={size.id}
                                className={`${styles.sizeCard} ${selectedSize === size.id ? styles.selected : ''
                                    }`}
                                onClick={() => setSelectedSize(size.id)}
                                disabled={isGenerating}
                            >
                                <div className={styles.sizeName}>{size.name}</div>
                                <div className={styles.sizeDimensions}>{size.dimensions}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity Selection */}
                <div className={styles.section}>
                    <label>Кількість креативів: {quantity}</label>
                    <input
                        type="range"
                        min="1"
                        max="4"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        disabled={isGenerating}
                        className={styles.slider}
                    />
                    <div className={styles.quantityLabels}>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                    </div>
                </div>

                {/* Reference Images - Template/Background */}
                <div className={styles.section}>
                    <label>📎 Шаблон / Фон</label>
                    <p className={styles.hint}>Завантажте зображення шаблону або фону для креативу</p>
                    <MultiImageUpload
                        onImagesChange={setTemplateImages}
                        maxImages={5}
                    />
                </div>

                {/* Reference Images - Person/Product */}
                <div className={styles.section}>
                    <label>👤 Людина / Товар</label>
                    <p className={styles.hint}>Завантажте фото спікера або товару</p>
                    <MultiImageUpload
                        onImagesChange={setPersonProductImages}
                        maxImages={5}
                    />
                </div>

                {/* Reference Images - Logo */}
                <div className={styles.section}>
                    <label>🏢 Логотип</label>
                    <p className={styles.hint}>Завантажте логотип компанії або бренду</p>
                    <MultiImageUpload
                        onImagesChange={setLogoImages}
                        maxImages={3}
                    />
                </div>

                {/* Optional Text Description */}
                <div className={styles.section}>
                    <label>Додатковий опис (опціонально)</label>
                    <textarea
                        placeholder="Додайте текстовий опис стилю або особливих вимог..."
                        value={referenceDescription}
                        onChange={(e) => setReferenceDescription(e.target.value)}
                        disabled={isGenerating}
                        rows={2}
                    />
                </div>

                {/* Generate Button */}
                <button
                    className="btn btn-primary btn-lg w-full"
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedAudience}
                >
                    {isGenerating ? (
                        <>
                            <div className="spinner" />
                            Генерую...
                        </>
                    ) : (
                        <>🎨 Згенерувати креативи</>
                    )}
                </button>
            </div>

            {/* Generated Images Preview */}
            {generatedImages.length > 0 && (
                <div id="generation-results" className={styles.results}>
                    <h4>✨ ЩОЙНО ЗГЕНЕРОВАНІ креативи ({generatedImages.length})</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        ⬇️ Це ваші нові креативи. Вони також збережені в Галереї.
                    </p>
                    <div className={styles.imageGrid}>
                        {generatedImages.map((url, index) => (
                            <div key={index} className={styles.imageCard}>
                                <img src={url} alt={`Generated creative ${index + 1}`} />
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                >
                                    Відкрити
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
