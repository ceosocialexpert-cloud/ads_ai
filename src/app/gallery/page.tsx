'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GeneratedCreative } from '@/lib/supabase';
import CreativeCard from '@/components/CreativeCard';
import ImageModal from '@/components/ImageModal';
import { CREATIVE_FORMATS, SIZE_OPTIONS } from '@/lib/prompts';
import styles from './page.module.css';

export default function GalleryPage() {
    const [creatives, setCreatives] = useState<GeneratedCreative[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCreative, setSelectedCreative] = useState<GeneratedCreative | null>(null);

    // Filters
    const [formatFilter, setFormatFilter] = useState('');
    const [sizeFilter, setSizeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchCreatives = useCallback(async (reset = false) => {
        try {
            setIsLoading(true);
            const currentPage = reset ? 0 : page;
            const limit = 20;
            const offset = currentPage * limit;

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
            });

            if (formatFilter) params.append('format', formatFilter);
            if (sizeFilter) params.append('size', sizeFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await fetch(`/api/creatives?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                if (reset) {
                    setCreatives(data.creatives);
                } else {
                    setCreatives(prev => [...prev, ...data.creatives]);
                }
                setHasMore(data.creatives.length === limit);
                if (!reset) setPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('Failed to fetch creatives:', error);
        } finally {
            setIsLoading(false);
        }
    }, [formatFilter, sizeFilter, searchQuery, page]);

    // Initial load and filter changes
    useEffect(() => {
        setPage(0);
        fetchCreatives(true);
    }, [formatFilter, sizeFilter, searchQuery]); // Removed fetchCreatives from dependency array to avoid infinite loop if not memoized correctly, but added it back with useCallback

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            fetchCreatives(false);
        }
    };

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="Пошук за ЦА або промптом..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        value={formatFilter}
                        onChange={(e) => setFormatFilter(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Всі формати</option>
                        {CREATIVE_FORMATS.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>

                    <select
                        value={sizeFilter}
                        onChange={(e) => setSizeFilter(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Всі розміри</option>
                        {SIZE_OPTIONS.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {creatives.length === 0 && !isLoading ? (
                    <div className={styles.emptyState}>
                        <h3>Поки що немає креативів</h3>
                        <p>Створіть свій перший креатив на головній сторінці!</p>
                        <Link href="/" className="btn btn-primary">
                            Перейти до створення
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className={styles.grid}>
                            {creatives.map((creative) => (
                                <CreativeCard
                                    key={creative.id}
                                    creative={creative}
                                    onClick={() => setSelectedCreative(creative)}
                                />
                            ))}
                        </div>

                        {hasMore && (
                            <div className={styles.loadMore}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleLoadMore}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Завантаження...' : 'Завантажити ще'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <ImageModal
                creative={selectedCreative}
                onClose={() => setSelectedCreative(null)}
            />
        </div>
    );
}
