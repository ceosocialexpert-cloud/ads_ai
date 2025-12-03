'use client';

import { useState, useRef, useEffect } from 'react';
import { getSessionId } from '@/lib/session';
import MessageBubble from './MessageBubble';
import FileUpload from './FileUpload';
import styles from './ChatInterface.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

interface ChatInterfaceProps {
    onAnalysisComplete?: (projectId: string, analysis: any) => void;
}

export default function ChatInterface({ onAnalysisComplete }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'chat' | 'url' | 'screenshot' | 'description'>('chat');
    const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; base64: string; preview: string }>>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sessionId = getSessionId();

    useEffect(() => {
        loadChatHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

        try {
            // Check if message contains a URL
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = userMessage.match(urlRegex);

            if (urls && urls.length > 0) {
                // Auto-trigger analysis for URL
                const url = urls[0];
                const analysisResponse = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'url',
                        data: { url },
                        sessionId,
                    }),
                });

                const analysisResult = await analysisResponse.json();

                if (analysisResult.success) {
                    // Add system message about analysis completion (without detailed audience info)
                    const systemMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'system',
                        content: `✅ Аналіз сайту завершено! Знайдено ${analysisResult.analysis.target_audiences.length} сегментів цільової аудиторії. Перейдіть на сторінку "Проекти" для перегляду деталей.`,
                        created_at: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, systemMessage]);

                    if (onAnalysisComplete) {
                        onAnalysisComplete(analysisResult.project.id, analysisResult.analysis);
                    }
                } else {
                    throw new Error('Analysis failed');
                }
            } else if (filesToSend.length > 0) {
                // If images are uploaded, trigger analysis with images
                const analysisResponse = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'screenshot',
                        data: {
                            imageBase64: filesToSend[0].base64,
                            description: userMessage || undefined,
                        },
                        sessionId,
                    }),
                });

                const analysisResult = await analysisResponse.json();

                if (analysisResult.success) {
                    const systemMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'system',
                        content: `✅ Аналіз зображення завершено! Знайдено ${analysisResult.analysis.target_audiences.length} сегментів цільової аудиторії. Перейдіть на сторінку "Проекти" для перегляду деталей.`,
                        created_at: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, systemMessage]);

                    if (onAnalysisComplete) {
                        onAnalysisComplete(analysisResult.project.id, analysisResult.analysis);
                    }
                } else {
                    throw new Error('Analysis failed');
                }
            } else {
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

    return (
        <div className={styles.container}>
            <div className={styles.messages}>
                {messages.length === 0 && (
                    <div className={styles.welcome}>
                        <h2>👋 Вітаю!</h2>
                        <p>Я допоможу вам створити креативи для реклами в Facebook та Instagram.</p>
                        <p>Напишіть повідомлення, додайте посилання на сайт або завантажте скріншот для аналізу.</p>
                    </div>
                )}

                {messages.map(message => (
                    <MessageBubble key={message.id} message={message} />
                ))}

                {isLoading && (
                    <div className={styles.loadingMessage}>
                        <div className="spinner" />
                        <span>Думаю...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
                {mode === 'url' && (
                    <div className={styles.specialMode}>
                        <input
                            type="url"
                            placeholder="Введіть URL сайту..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleAnalyze('url', { url: input });
                                    setInput('');
                                }
                            }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                handleAnalyze('url', { url: input });
                                setInput('');
                            }}
                            disabled={!input.trim() || isLoading}
                        >
                            Проаналізувати
                        </button>
                        <button className="btn btn-ghost" onClick={() => setMode('chat')}>
                            Скасувати
                        </button>
                    </div>
                )}

                {mode === 'screenshot' && (
                    <div className={styles.specialMode}>
                        <FileUpload
                            onFileSelect={(base64) => handleAnalyze('screenshot', { imageBase64: base64 })}
                        />
                        <button className="btn btn-ghost" onClick={() => setMode('chat')}>
                            Скасувати
                        </button>
                    </div>
                )}

                {mode === 'description' && (
                    <div className={styles.specialMode}>
                        <textarea
                            placeholder="Опишіть ваш проект, продукт або послугу..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            rows={4}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                handleAnalyze('description', { description: input });
                                setInput('');
                            }}
                            disabled={!input.trim() || isLoading}
                        >
                            Проаналізувати
                        </button>
                        <button className="btn btn-ghost" onClick={() => setMode('chat')}>
                            Скасувати
                        </button>
                    </div>
                )}

                {mode === 'chat' && (
                    <>
                        {uploadedFiles.length > 0 && (
                            <div className={styles.filePreviewContainer}>
                                {uploadedFiles.map(file => (
                                    <div key={file.id} className={styles.filePreview}>
                                        <img src={file.preview} alt="Preview" />
                                        <button
                                            className={styles.removeFile}
                                            onClick={() => removeFile(file.id)}
                                            type="button"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={styles.chatInput}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                            />
                            <button
                                className="btn btn-ghost"
                                onClick={() => fileInputRef.current?.click()}
                                title="Завантажити зображення"
                                disabled={uploadedFiles.length >= 14}
                            >
                                📎 {uploadedFiles.length > 0 && `(${uploadedFiles.length}/14)`}
                            </button>
                            <input
                                type="text"
                                placeholder="Напишіть повідомлення, додайте посилання або опис..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleSendMessage}
                                disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                            >
                                Надіслати
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
