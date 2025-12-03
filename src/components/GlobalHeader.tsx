'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './GlobalHeader.module.css';

export default function GlobalHeader() {
    const pathname = usePathname();

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🎨</span>
                    <span className={styles.logoText}>AI Creative</span>
                </Link>

                <nav className={styles.nav}>
                    <Link 
                        href="/" 
                        className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}
                    >
                        🏠 Головна
                    </Link>
                    <Link 
                        href="/projects" 
                        className={`${styles.navLink} ${pathname.startsWith('/projects') ? styles.active : ''}`}
                    >
                        📁 Проекти
                    </Link>
                    <Link 
                        href="/gallery" 
                        className={`${styles.navLink} ${pathname === '/gallery' ? styles.active : ''}`}
                    >
                        🖼️ Галерея
                    </Link>
                </nav>
            </div>
        </header>
    );
}
