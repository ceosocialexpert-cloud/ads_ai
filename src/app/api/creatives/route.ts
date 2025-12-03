import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const format = searchParams.get('format');
        const size = searchParams.get('size');
        const search = searchParams.get('search');

        const supabase = getServerSupabase();

        // Build the query
        let query = supabase
            .from('generated_creatives')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (format) {
            query = query.eq('format', format);
        }

        if (size) {
            query = query.eq('size', size);
        }

        if (search) {
            // Search in target_audience or prompt_used fields
            query = query.or(`target_audience.ilike.%${search}%,prompt_used.ilike.%${search}%`);
        }

        const { data: creatives, error } = await query;

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch creatives' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            creatives,
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Fetch failed' },
            { status: 500 }
        );
    }
}