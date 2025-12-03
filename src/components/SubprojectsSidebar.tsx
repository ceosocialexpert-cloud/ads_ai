import { Subproject } from '@/lib/supabase';
import styles from './SubprojectsSidebar.module.css';

interface SubprojectsSidebarProps {
    projectId: string;
    projectName: string;
    subprojects: Subproject[];
    selectedView: 'main' | string;
    onSelectMain: () => void;
    onSelectSubproject: (id: string) => void;
    onAddSubproject: () => void;
}

export default function SubprojectsSidebar({
    projectId,
    projectName,
    subprojects,
    selectedView,
    onSelectMain,
    onSelectSubproject,
    onAddSubproject,
}: SubprojectsSidebarProps) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <h3>Структура проекту</h3>
            </div>

            {/* Main Project */}
            <button
                className={`${styles.sidebarItem} ${selectedView === 'main' ? styles.active : ''}`}
                onClick={onSelectMain}
            >
                <span className={styles.icon}>📁</span>
                <div className={styles.itemContent}>
                    <div className={styles.itemName}>{projectName}</div>
                    <div className={styles.itemBadge}>Основний</div>
                </div>
            </button>

            {/* Subprojects */}
            {subprojects.length > 0 && (
                <div className={styles.subprojectsSection}>
                    <div className={styles.sectionLabel}>Під-проекти</div>
                    {subprojects.map((subproject) => (
                        <button
                            key={subproject.id}
                            className={`${styles.sidebarItem} ${styles.subprojectItem} ${
                                selectedView === subproject.id ? styles.active : ''
                            }`}
                            onClick={() => onSelectSubproject(subproject.id)}
                        >
                            <span className={styles.icon}>
                                {subproject.type === 'webinar' && '🎥'}
                                {subproject.type === 'landing' && '📄'}
                                {subproject.type === 'campaign' && '📢'}
                            </span>
                            <div className={styles.itemContent}>
                                <div className={styles.itemName}>{subproject.name}</div>
                                <div className={styles.itemType}>
                                    {subproject.type === 'webinar' && 'Вебінар'}
                                    {subproject.type === 'landing' && 'Лендінг'}
                                    {subproject.type === 'campaign' && 'Кампанія'}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Add Subproject Button */}
            <button className={styles.addButton} onClick={onAddSubproject}>
                <span>+</span>
                Додати під-проект
            </button>
        </aside>
    );
}
