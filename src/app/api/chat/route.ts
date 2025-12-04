import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/gemini';
import { getServerSupabase } from '@/lib/supabase';

// Функція для очищення markdown форматування
function cleanMarkdown(text: string): string {
    return text
        // Видаляємо таблиці markdown
        .replace(/\|.*\|/g, '')
        .replace(/[:|\-]{3,}/g, '')
        // Видаляємо жирний текст
        .replace(/\*\*(.+?)\*\*/g, '$1')
        // Видаляємо курсив
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        // Видаляємо заголовки
        .replace(/^#{1,6}\s+/gm, '')
        // Видаляємо inline code
        .replace(/`(.+?)`/g, '$1')
        // Видаляємо code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Видаляємо посилання [text](url)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Очищаємо множинні порожні рядки
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, sessionId, history, systemMessage, saveOnly, metadata } = body;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        // Handle system message save only
        if (saveOnly && systemMessage) {
            const role = message === 'assistant' ? 'assistant' : 'system';
            await supabase.from('chat_messages').insert({
                session_id: sessionId,
                role: role,
                content: systemMessage,
                metadata: metadata || null,
            });

            return NextResponse.json({
                success: true,
            });
        }
        
        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Save user message
        await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'user',
            content: message,
        });

        // Get chat response
        const messages = [
            ...(history || []),
            { role: 'user', content: message },
        ];

        const response = await chat(messages);
        
        // Очищаємо markdown форматування
        const cleanedResponse = cleanMarkdown(response);

        // Save assistant response
        await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: cleanedResponse,
        });

        return NextResponse.json({
            success: true,
            response: cleanedResponse,
        });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Chat failed' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            messages: messages || [],
        });
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        // Delete all chat messages for this session
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('session_id', sessionId);

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Chat history cleared',
        });
    } catch (error) {
        console.error('Failed to clear chat history:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to clear chat history' },
            { status: 500 }
        );
    }
}
