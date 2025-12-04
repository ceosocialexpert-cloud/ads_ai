'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './CascadingProjectSelector.module.css';

interface Project {
    id: string;
    name: string;
    sub_projects?: SubProject[];
    analysis?: {
        target_audiences?: Audience[];
    };
}

interface SubProject {
    id: string;
    name: string;
    target_audiences?: Audience[];
}

interface Audience {
    id: string;
    name: string;
}

interface CascadingProjectSelectorProps {
    projects: Project[];
    currentProject: Project | null;
    selectedAudience: string;
    onSelect: (projectId: string, subProjectId: string | null, audienceId: string) => void;
    onProjectChange: (projectId: string) => void;
}

export default function CascadingProjectSelector({
    projects = [],
    currentProject,
    selectedAudience,
    onSelect,
    onProjectChange
}: CascadingProjectSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeProject, setActiveProject] = useState<string | null>(null);
    const [activeSubProject, setActiveSubProject] = useState<string | null>(null);
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
    const [loadedSubprojects, setLoadedSubprojects] = useState<SubProject[]>([]);
    const [loadingSubprojects, setLoadingSubprojects] = useState(false);
    const [loadedSubprojectAudiences, setLoadedSubprojectAudiences] = useState<Audience[]>([]);
    const [loadingAudiences, setLoadingAudiences] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Close modal on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setActiveProject(null);
                setActiveSubProject(null);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Calculate modal position when opened
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Position above the trigger
            setModalPosition({
                top: rect.top - 10,
                left: rect.left
            });
        }
    }, [isOpen]);

    // Load subprojects when project is selected
    useEffect(() => {
        if (activeProject) {
            loadSubprojects(activeProject);
        } else {
            setLoadedSubprojects([]);
        }
    }, [activeProject]);

    // Load subproject audiences when subproject is selected
    useEffect(() => {
        if (activeProject && activeSubProject && activeSubProject !== 'general') {
            loadSubprojectAudiences(activeProject, activeSubProject);
        } else {
            setLoadedSubprojectAudiences([]);
        }
    }, [activeSubProject]);

    const loadSubprojects = async (projectId: string) => {
        setLoadingSubprojects(true);
        try {
            const response = await fetch(`/api/subprojects?projectId=${projectId}`);
            const data = await response.json();
            if (data.success) {
                setLoadedSubprojects(data.subprojects || []);
            }
        } catch (error) {
            console.error('Failed to load subprojects:', error);
            setLoadedSubprojects([]);
        } finally {
            setLoadingSubprojects(false);
        }
    };

    const loadSubprojectAudiences = async (projectId: string, subprojectId: string) => {
        setLoadingAudiences(true);
        try {
            const response = await fetch(`/api/subprojects?projectId=${projectId}&subprojectId=${subprojectId}`);
            const data = await response.json();
            if (data.success && data.subproject) {
                setLoadedSubprojectAudiences(data.subproject.target_audiences || []);
            }
        } catch (error) {
            console.error('Failed to load subproject audiences:', error);
            setLoadedSubprojectAudiences([]);
        } finally {
            setLoadingAudiences(false);
        }
    };

    const getDisplayText = () => {
        if (!currentProject) return 'Проект → ЦА';

        const projectName = currentProject.name || 'Проект';

        const audience = currentProject.analysis?.target_audiences?.find(
            (a: Audience) => a.id === selectedAudience
        );

        if (audience) {
            return `${projectName} → ${audience.name}`;
        }

        return projectName;
    };

    // Get audiences for a project
    const getAudiences = (projectId: string): Audience[] => {
        if (currentProject?.id === projectId) {
            return currentProject?.analysis?.target_audiences ?? [];
        }
        const inList = projects.find(p => p.id === projectId);
        return inList?.analysis?.target_audiences ?? [];
    };

    const handleProjectClick = (projectId: string) => {
        setActiveProject(projectId);
        setActiveSubProject(null);

        // Load project details if needed
        if (projectId !== currentProject?.id) {
            onProjectChange(projectId);
        }
    };

    const handleSubProjectClick = (subProjectId: string) => {
        setActiveSubProject(subProjectId);
    };

    const handleAudienceSelect = (projectId: string, subProjectId: string | null, audienceId: string) => {
        onSelect(projectId, subProjectId, audienceId);
        setIsOpen(false);
        setActiveProject(null);
        setActiveSubProject(null);
    };

    const handleClearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect('', null, '');
        onProjectChange('');
        setIsOpen(false);
    };

    const handleTriggerClick = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setActiveProject(null);
            setActiveSubProject(null);
        }
    };

    // Get audiences for column 3
    const getColumn3Audiences = (): Audience[] => {
        if (activeSubProject === 'general') {
            return activeProject ? getAudiences(activeProject) : [];
        }
        return loadedSubprojectAudiences;
    };

    return (
        <div className={styles.container}>
            <div className={styles.triggerWrapper}>
                <button
                    ref={triggerRef}
                    className={styles.trigger}
                    onClick={handleTriggerClick}
                    title="Вибрати проект та цільову аудиторію"
                >
                    {getDisplayText()}
                    <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {(currentProject && selectedAudience) && (
                    <button
                        className={styles.clearBtn}
                        onClick={handleClearSelection}
                        title="Очистити вибір"
                    >
                        ×
                    </button>
                )}
            </div>

            {isOpen && (
                <>
                    <div className={styles.overlay} onClick={() => setIsOpen(false)} />
                    <div
                        ref={modalRef}
                        className={styles.modal}
                        style={{
                            bottom: `${window.innerHeight - modalPosition.top}px`,
                            left: `${modalPosition.left}px`,
                        }}
                    >
                        {/* Column 1: Projects */}
                        <div className={styles.column}>
                            <div className={styles.columnHeader}>Проекти</div>
                            <div className={styles.columnList}>
                                {projects.length === 0 ? (
                                    <div className={styles.emptyState}>Немає проектів</div>
                                ) : (
                                    projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className={`${styles.item} ${activeProject === project.id ? styles.active : ''}`}
                                            onClick={() => handleProjectClick(project.id)}
                                        >
                                            <span className={styles.itemName}>{project.name}</span>
                                            <span className={styles.itemArrow}>›</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Column 2: "Загальні ЦА" + Sub-projects */}
                        {activeProject && (
                            <div className={styles.column}>
                                <div className={styles.columnHeader}>Під-проекти</div>
                                <div className={styles.columnList}>
                                    {/* Always show "Загальні ЦА" option for project-level audiences */}
                                    <div
                                        className={`${styles.item} ${activeSubProject === 'general' ? styles.active : ''}`}
                                        onClick={() => handleSubProjectClick('general')}
                                    >
                                        <span className={styles.itemName}>📊 Загальні ЦА</span>
                                        <span className={styles.itemArrow}>›</span>
                                    </div>

                                    {/* Loading state */}
                                    {loadingSubprojects && (
                                        <div className={styles.emptyState}>Завантаження...</div>
                                    )}

                                    {/* Sub-projects list */}
                                    {!loadingSubprojects && loadedSubprojects.map((sp) => (
                                        <div
                                            key={sp.id}
                                            className={`${styles.item} ${activeSubProject === sp.id ? styles.active : ''}`}
                                            onClick={() => handleSubProjectClick(sp.id)}
                                        >
                                            <span className={styles.itemName}>{sp.name}</span>
                                            <span className={styles.itemArrow}>›</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Column 3: Audiences */}
                        {activeProject && activeSubProject && (
                            <div className={styles.column}>
                                <div className={styles.columnHeader}>Цільові аудиторії</div>
                                <div className={styles.columnList}>
                                    {loadingAudiences ? (
                                        <div className={styles.emptyState}>Завантаження...</div>
                                    ) : getColumn3Audiences().length === 0 ? (
                                        <div className={styles.emptyState}>Немає аудиторій</div>
                                    ) : (
                                        getColumn3Audiences().map((audience) => (
                                            <div
                                                key={audience.id}
                                                className={styles.audienceItem}
                                                onClick={() => handleAudienceSelect(
                                                    activeProject,
                                                    activeSubProject === 'general' ? null : activeSubProject,
                                                    audience.id
                                                )}
                                            >
                                                {audience.name}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
