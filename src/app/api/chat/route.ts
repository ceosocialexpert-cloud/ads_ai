import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/gemini';
import { getServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, sessionId, history } = body;

        if (!sessionId || !message) {
            return NextResponse.json(
                { error: 'Session ID and message are required' },
                { status: 400 }
            );
        }

        // Save user message
        const supabase = getServerSupabase();

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

        // Save assistant response
        await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: response,
        });

        return NextResponse.json({
            success: true,
            response,
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
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch messages' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            messages,
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Fetch failed' },
            { status: 500 }
        );
    }
}
