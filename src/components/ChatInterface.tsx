'use client';

import { useState, useRef, useEffect } from 'react';
import { getSessionId } from '@/lib/session';
import { SIZE_OPTIONS } from '@/lib/prompts';
import MessageBubble from './MessageBubble';
import FileUpload from './FileUpload';
import CascadingProjectSelector from './CascadingProjectSelector';
import styles from './ChatInterface.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: {
        type?: string;
        image?: string;
        images?: string[];
        size?: string;
        [key: string]: any;
    };
    created_at: string;
}

interface ChatInterfaceProps {
    onAnalysisComplete?: (projectId: string, analysis: any) => void;
    initialMessages?: Message[];
    onOpenCreateModal?: (url: string) => void;
    availableProjects: any[];
    currentProject: { id: string; name?: string; analysis: any; target_audiences?: any[] } | null;
    onProjectSelect: (projectId: string) => void;
}

export default function ChatInterface({
    onAnalysisComplete,
    initialMessages,
    onOpenCreateModal,
    availableProjects,
    currentProject,
    onProjectSelect
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages || []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeGenerations, setActiveGenerations] = useState(0); // Лічильник активних генерацій
    const [mode, setMode] = useState<'chat' | 'url' | 'screenshot' | 'description'>('chat');
    const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; base64: string; preview: string }>>([]);
    const [isCreativeMode, setIsCreativeMode] = useState(false); // Режим генерації креативу

    // Generation parameters
    const [selectedAudience, setSelectedAudience] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('instagram-square');
    const [quantity, setQuantity] = useState<number>(1);
    const [templateFiles, setTemplateFiles] = useState<File[]>([]);
    const [logoFiles, setLogoFiles] = useState<File[]>([]);
    const [personFiles, setPersonFiles] = useState<File[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const templateInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const personInputRef = useRef<HTMLInputElement>(null);
    const sessionId = getSessionId();

    const targetAudiences = currentProject?.target_audiences || currentProject?.analysis?.target_audiences || [];

    // Збереження стану генерації в localStorage
    const saveGenerationState = async () => {
        try {
            // Конвертуємо файли в base64 для збереження
            const convertFilesToBase64 = async (files: File[]): Promise<Array<{ name: string, base64: string, type: string }>> => {
                const promises = files.map(file => {
                    return new Promise<{ name: string, base64: string, type: string }>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64 = reader.result as string;
                            resolve({ name: file.name, base64, type: file.type });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                });
                return Promise.all(promises);
            };

            const templateBase64 = await convertFilesToBase64(templateFiles);
            const logoBase64 = await convertFilesToBase64(logoFiles);
            const personBase64 = await convertFilesToBase64(personFiles);

            const state = {
                input,
                selectedAudience,
                selectedSize,
                quantity,
                isCreativeMode,
                projectId: currentProject?.id || null,
                templateFiles: templateBase64,
                logoFiles: logoBase64,
                personFiles: personBase64,
            };
            localStorage.setItem('generationState', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save generation state:', error);
        }
    };

    // Завантаження стану генерації з localStorage
    const loadGenerationState = async () => {
        try {
            const saved = localStorage.getItem('generationState');
            if (saved) {
                const state = JSON.parse(saved);
                if (state.input) setInput(state.input);
                if (state.selectedAudience) setSelectedAudience(state.selectedAudience);
                if (state.selectedSize) setSelectedSize(state.selectedSize);
                if (state.quantity) setQuantity(state.quantity);
                if (typeof state.isCreativeMode === 'boolean') setIsCreativeMode(state.isCreativeMode);

                // Відновлюємо проект якщо він був обраний
                if (state.projectId && onProjectSelect) {
                    onProjectSelect(state.projectId);
                }

                // Відновлюємо файли з base64
                const convertBase64ToFiles = async (filesData: Array<{ name: string, base64: string, type: string }>): Promise<File[]> => {
                    if (!filesData || filesData.length === 0) return [];

                    const promises = filesData.map(async (fileData) => {
                        const response = await fetch(fileData.base64);
                        const blob = await response.blob();
                        return new File([blob], fileData.name, { type: fileData.type });
                    });
                    return Promise.all(promises);
                };

                if (state.templateFiles && state.templateFiles.length > 0) {
                    const files = await convertBase64ToFiles(state.templateFiles);
                    setTemplateFiles(files);
                }
                if (state.logoFiles && state.logoFiles.length > 0) {
                    const files = await convertBase64ToFiles(state.logoFiles);
                    setLogoFiles(files);
                }
                if (state.personFiles && state.personFiles.length > 0) {
                    const files = await convertBase64ToFiles(state.personFiles);
                    setPersonFiles(files);
                }
            }
        } catch (error) {
            console.error('Failed to load generation state:', error);
        }
    };

    useEffect(() => {
        loadChatHistory();
        loadGenerationState();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Зберігаємо стан при кожній зміні параметрів генерації
    useEffect(() => {
        saveGenerationState();
    }, [input, selectedAudience, selectedSize, quantity, isCreativeMode, currentProject, templateFiles, logoFiles, personFiles]);

    // Update messages when initialMessages changes
    useEffect(() => {
        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
        }
    }, [initialMessages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadChatHistory = async () => {
        try {
            const response = await fetch(`/api/chat?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.success && data.messages) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    };

    const handleClearChat = async () => {
        if (!confirm('Ви впевнені, що хочете очистити всю історію чату? Цю дію неможливо скасувати.')) {
            return;
        }

        try {
            const response = await fetch(`/api/chat?sessionId=${sessionId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                setMessages([]);
                alert('✅ Історія чату очищена');
            } else {
                alert('❗ Помилка очищення чату: ' + data.error);
            }
        } catch (error) {
            console.error('Failed to clear chat:', error);
            alert('❗ Помилка очищення чату');
        }
    };

    const handleSendMessage = async () => {
        if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

        const userMessage = input.trim();
        const filesToSend = [...uploadedFiles];

        setInput('');
        setUploadedFiles([]);
        setIsLoading(true);

        // Add user message to UI
        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage || `📎 Надіслано ${filesToSend.length} зображень`,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMessage]);

        // Check if user confirmed to create project
        const isConfirmation = /^(так|да|таки|yes|yeah)$/i.test(userMessage.trim());
        if (isConfirmation && (window as any).__pendingProjectUrl && onOpenCreateModal) {
            const url = (window as any).__pendingProjectUrl;
            delete (window as any).__pendingProjectUrl;
            onOpenCreateModal(url);
            setIsLoading(false);
            return;
        }

        try {
            // Regular chat message (even if contains URL)
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            const data = await response.json();

            if (data.success) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response,
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, assistantMessage]);

                // Check if response asks about creating project from URL
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const urls = userMessage.match(urlRegex);
                if (urls && urls.length > 0 && data.response.includes('Хочете створити')) {
                    // User sent URL and assistant is asking for confirmation
                    // Store URL for later use when user confirms
                    (window as any).__pendingProjectUrl = urls[0];
                }
            }
        } catch (error) {
            console.error('Failed to process message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'system',
                content: '❌ Помилка обробки повідомлення. Спробуйте ще раз.',
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async (type: 'url' | 'screenshot' | 'description', data: any) => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    data,
                    sessionId,
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Add system message about analysis
                const systemMessage: Message = {
                    id: Date.now().toString(),
                    role: 'system',
                    content: `✅ Аналіз завершено! Знайдено ${result.analysis.target_audiences.length} сегментів цільової аудиторії. Перейдіть на сторінку "Проекти" для перегляду деталей.`,
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, systemMessage]);

                // Notify parent component
                if (onAnalysisComplete) {
                    onAnalysisComplete(result.project.id, result.analysis);
                }

                // Reset to chat mode
                setMode('chat');
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'system',
                content: '❌ Помилка аналізу. Спробуйте ще раз.',
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickReply = async (reply: string) => {
        if (isLoading) return;

        const userMessage = reply;
        setIsLoading(true);

        // Add user message to UI immediately
        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMessage]);

        // Check if user confirmed to create project
        const isConfirmation = /^(так|да|таки|yes|yeah)$/i.test(userMessage.trim());
        if (isConfirmation && (window as any).__pendingProjectUrl && onOpenCreateModal) {
            const url = (window as any).__pendingProjectUrl;
            delete (window as any).__pendingProjectUrl;
            onOpenCreateModal(url);
            setIsLoading(false);
            return;
        }

        try {
            // Regular chat message
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            const data = await response.json();

            if (data.success) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response,
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, assistantMessage]);

                // Check if response asks about creating project from URL
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const urls = userMessage.match(urlRegex);
                if (urls && urls.length > 0 && data.response.includes('Хочете створити')) {
                    // User sent URL and assistant is asking for confirmation
                    // Store URL for later use when user confirms
                    (window as any).__pendingProjectUrl = urls[0];
                }
            }
        } catch (error) {
            console.error('Failed to process message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'system',
                content: '❌ Помилка обробки повідомлення. Спробуйте ще раз.',
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const maxFiles = 14;
        const remainingSlots = maxFiles - uploadedFiles.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        for (const file of filesToProcess) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = event.target?.result as string;
                    const base64 = preview.split(',')[1];

                    setUploadedFiles(prev => [...prev, {
                        id: `${Date.now()}-${Math.random()}`,
                        base64,
                        preview,
                    }]);
                };
                reader.readAsDataURL(file);
            }
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleResizeImage = async (imageBase64: string, currentSize: string, targetSize: string) => {
        setIsLoading(true);

        // Add "resizing" message
        const resizingMessage: Message = {
            id: Date.now().toString(),
            role: 'system',
            content: `🔄 Адаптую зображення з ${currentSize} до ${targetSize}...`,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, resizingMessage]);

        try {
            const response = await fetch('/api/resize-creative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64,
                    targetSize,
                    sessionId,
                    projectId: currentProject?.id || null,
                    projectName: currentProject?.name || 'Ресайз',
                    targetAudience: selectedAudience ? targetAudiences.find((a: any) => a.id === selectedAudience)?.name : 'Ресайз',
                }),
            });

            const data = await response.json();

            if (data.success) {
                const resultMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `✅ Креатив адаптовано до розміру ${targetSize}`,
                    metadata: {
                        type: 'generated_creative',
                        images: [data.resizedImage],
                        size: targetSize,
                    },
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, resultMessage]);

                // Зберігаємо повідомлення про адаптацію в базу даних
                try {
                    await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId,
                            message: 'assistant',
                            systemMessage: resultMessage.content,
                            metadata: resultMessage.metadata,
                            saveOnly: true,
                        }),
                    });
                } catch (saveError) {
                    console.error('Failed to save resize result to chat history:', saveError);
                }
            } else {
                throw new Error(data.error || 'Resize failed');
            }
        } catch (error) {
            console.error('Resize failed:', error);
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'system',
                content: '❌ Помилка адаптації зображення. Спробуйте ще раз.',
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerationFileSelect = (files: FileList | null, type: 'template' | 'logo' | 'person') => {
        if (!files) return;
        const fileArray = Array.from(files);

        if (type === 'template') setTemplateFiles(fileArray);
        if (type === 'logo') setLogoFiles(fileArray);
        if (type === 'person') setPersonFiles(fileArray);
    };

    // Функції для видалення файлів
    const removeTemplateFile = () => {
        setTemplateFiles([]);
    };

    const removeLogoFile = () => {
        setLogoFiles([]);
    };

    const removePersonFile = () => {
        setPersonFiles([]);
    };

    const handleSmartSend = async () => {
        // Визначаємо чи це генерація креативу чи звичайний чат
        // Генерація можлива якщо: (є проект + аудиторія) АБО (включений режим креативу + є зображення/текст)
        const isGenerationWithProject = currentProject && selectedAudience;
        const isCreativeModeGeneration = isCreativeMode && (templateFiles.length > 0 || input.trim());
        const isGeneration = isGenerationWithProject || isCreativeModeGeneration;

        if (isGeneration) {
            // Генерація креативу
            await handleGenerate();
        } else {
            // Звичайний чат
            await handleSendMessage();
        }
    };

    const handleGenerate = async () => {
        // Перевірка: якщо НЕ режим креативу, то потрібен проект і аудиторія
        if (!isCreativeMode) {
            if (!currentProject) {
                alert('Оберіть проект або ввімкніть "Режим креативу"');
                return;
            }
            if (!selectedAudience) {
                alert('Оберіть цільову аудиторію');
                return;
            }
        }

        // Якщо режим креативу, перевіряємо що є хоча б зображення або текст
        if (isCreativeMode && templateFiles.length === 0 && !input.trim()) {
            alert('Додайте зображення або опис креативу');
            return;
        }

        setIsLoading(true);
        setActiveGenerations(prev => prev + 1);

        const generatingMessage: Message = {
            id: Date.now().toString(),
            role: 'system',
            content: input.trim()
                ? `📡 Генерую креатив з промптом: "${input.trim()}"... 🎨`
                : '📡 Генерую креатив... 🎨',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, generatingMessage]);

        // Зберігаємо повідомлення "Генерую..." в базу
        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    message: 'system',
                    systemMessage: generatingMessage.content,
                    saveOnly: true,
                }),
            });
        } catch (saveError) {
            console.error('Failed to save generating message:', saveError);
        }

        try {
            // Конвертуємо файли в base64
            const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
                const promises = files.map(file => {
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            // Видаляємо префікс "data:image/...;base64,"
                            const base64 = (reader.result as string).split(',')[1];
                            resolve(base64);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                });
                return Promise.all(promises);
            };

            const templateBase64 = await convertFilesToBase64(templateFiles);
            const logoBase64 = await convertFilesToBase64(logoFiles);
            const personBase64 = await convertFilesToBase64(personFiles);

            console.log('Template files count:', templateFiles.length);
            console.log('Logo files count:', logoFiles.length);
            console.log('Person files count:', personFiles.length);
            console.log('First template base64 length:', templateBase64[0]?.length || 0);

            // Знаходимо об'єкт аудиторії (якщо є проект)
            const audienceDetails = currentProject
                ? targetAudiences.find((a: any) => a.id === selectedAudience)
                : null;

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    projectId: currentProject?.id || null, // Може бути null у режимі креативу
                    targetAudience: selectedAudience || null,
                    targetAudienceDetails: audienceDetails,
                    format: 'lifestyle', // Використовуємо дефолтний формат
                    size: selectedSize,
                    quantity,
                    referenceImages: {
                        template: templateBase64.map(b64 => ({ base64: b64, type: 'style' })),
                        logo: logoBase64.map(b64 => ({ base64: b64, type: 'subject' })),
                        personProduct: personBase64.map(b64 => ({ base64: b64, type: 'subject' })),
                    },
                    referenceDescription: input.trim() || undefined,
                    userText: input.trim() || undefined, // Текст який користувач вказав
                    isCreativeMode, // Передаємо режим креативу
                }),
            });

            const data = await response.json();

            if (data.success) {
                const sizeInfo = SIZE_OPTIONS.find(s => s.id === selectedSize);
                const resultMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `✅ Згенеровано ${data.imageUrls.length} креативів (${sizeInfo?.ratio || selectedSize})`,
                    metadata: {
                        type: 'generated_creative',
                        images: data.imageUrls,
                        size: sizeInfo?.dimensions || selectedSize,
                    },
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, resultMessage]);

                // Зберігаємо повідомлення з результатом генерації в базу даних
                try {
                    await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId,
                            message: 'assistant',
                            systemMessage: resultMessage.content,
                            metadata: resultMessage.metadata,
                            saveOnly: true,
                        }),
                    });
                } catch (saveError) {
                    console.error('Failed to save generation result to chat history:', saveError);
                }

                // НЕ очищаємо поля - зберігаємо для наступної генерації
                // setInput('');
                // setTemplateFiles([]);
                // setLogoFiles([]);
                // setPersonFiles([]);
            } else {
                throw new Error(data?.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Generation error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: '❌ Помилка генерації: ' + (error instanceof Error ? error.message : 'Невідома помилка'),
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setActiveGenerations(prev => Math.max(0, prev - 1));
            setIsLoading(activeGenerations > 1); // Залишаємо true якщо є інші активні генерації
        }
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.messages}>
                    {/* Clear Chat button - shown when there are messages */}
                    {messages.length > 0 && (
                        <div className={styles.clearChatContainer}>
                            <button
                                className={styles.clearChatBtn}
                                onClick={handleClearChat}
                                title="Очистити історію чату"
                            >
                                🗑️ Очистити чат
                            </button>
                        </div>
                    )}

                    {messages.length === 0 && (
                        <div className={styles.welcome}>
                            <h2>👋 Вітаю!</h2>
                            <p>Я допоможу вам створити креативи для реклами в Facebook та Instagram.</p>
                            <p>Напишіть повідомлення, додайте посилання на сайт або завантажте скріншот для аналізу.</p>
                        </div>
                    )}

                    {messages.map(message => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onQuickReply={handleQuickReply}
                            onResizeImage={handleResizeImage}
                        />
                    ))}

                    {isLoading && (
                        <div className={styles.loadingMessage}>
                            <div className="spinner" />
                            <span>Думаю...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className={styles.inputArea}>
                {mode === 'chat' && (
                    <div className={styles.unifiedInput}>
                        {/* Hidden file inputs */}
                        <input
                            ref={templateInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleGenerationFileSelect(e.target.files, 'template')}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleGenerationFileSelect(e.target.files, 'logo')}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={personInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleGenerationFileSelect(e.target.files, 'person')}
                            style={{ display: 'none' }}
                        />

                        <div className={styles.singleLineControls}>
                            {/* Кнопки завантаження файлів */}
                            <button
                                className={styles.iconBtn}
                                onClick={() => templateInputRef.current?.click()}
                                title="Шаблон / Фон"
                            >
                                📎 {templateFiles.length > 0 && `(${templateFiles.length})`}
                            </button>

                            <button
                                className={styles.iconBtn}
                                onClick={() => logoInputRef.current?.click()}
                                title="Логотип"
                            >
                                🏢 {logoFiles.length > 0 && `(${logoFiles.length})`}
                            </button>

                            <button
                                className={styles.iconBtn}
                                onClick={() => personInputRef.current?.click()}
                                title="Людина / Товар"
                            >
                                👤 {personFiles.length > 0 && `(${personFiles.length})`}
                            </button>

                            {/* Каскадний селектор Проект → ЦА */}
                            <CascadingProjectSelector
                                projects={availableProjects}
                                currentProject={currentProject as any}
                                selectedAudience={selectedAudience}
                                onSelect={(projectId, subProjectId, audienceId) => {
                                    onProjectSelect(projectId);
                                    setSelectedAudience(audienceId);
                                }}
                                onProjectChange={onProjectSelect}
                            />

                            {/* Розмір */}
                            <select
                                value={selectedSize}
                                onChange={(e) => setSelectedSize(e.target.value)}
                                className={styles.selectSmall}
                            >
                                {SIZE_OPTIONS.map((size) => (
                                    <option key={size.id} value={size.id}>
                                        {size.ratio}
                                    </option>
                                ))}
                            </select>

                            {/* Кількість */}
                            <input
                                type="number"
                                min="1"
                                max="4"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className={styles.numberInput}
                                title="Кількість"
                            />
                            <span className={styles.label}>шт</span>

                            {/* Чекбокс режиму генерації */}
                            <label className={styles.creativeModeLabel}>
                                <input
                                    type="checkbox"
                                    checked={isCreativeMode}
                                    onChange={(e) => setIsCreativeMode(e.target.checked)}
                                    className={styles.creativeModeCheckbox}
                                />
                                <span>✨</span>
                            </label>

                            {/* Попередній перегляд файлів - інлайн */}
                            {(templateFiles.length > 0 || logoFiles.length > 0 || personFiles.length > 0) && (
                                <div className={styles.inlineFilePreview}>
                                    {templateFiles.map((file, index) => (
                                        <div key={`template-${index}`} className={styles.miniPreview}>
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="Template"
                                            />
                                            <button
                                                className={styles.miniRemove}
                                                onClick={removeTemplateFile}
                                                title="Видалити шаблон"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {logoFiles.map((file, index) => (
                                        <div key={`logo-${index}`} className={styles.miniPreview}>
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="Logo"
                                            />
                                            <button
                                                className={styles.miniRemove}
                                                onClick={removeLogoFile}
                                                title="Видалити логотип"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {personFiles.map((file, index) => (
                                        <div key={`person-${index}`} className={styles.miniPreview}>
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="Person"
                                            />
                                            <button
                                                className={styles.miniRemove}
                                                onClick={removePersonFile}
                                                title="Видалити людину/товар"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Текстове поле */}
                            <input
                                type="text"
                                placeholder="Напишіть повідомлення..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSmartSend();
                                    }
                                }}
                                className={styles.textInput}
                            />

                            {/* Кнопка відправити */}
                            <button
                                className="btn btn-primary"
                                onClick={handleSmartSend}
                            >
                                {(currentProject && selectedAudience) || isCreativeMode ? '✨ Генерувати' : 'Надіслати'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
