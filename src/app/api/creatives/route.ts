import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format');
        const size = searchParams.get('size');
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = getServerSupabase();

        let query = supabase
            .from('generated_creatives')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        // Apply filters
        if (format) {
            query = query.eq('format', format);
        }

        if (size) {
            query = query.eq('size', size);
        }

        if (search) {
            query = query.or(`target_audience.ilike.%${search}%,prompt_used.ilike.%${search}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: creatives, error, count } = await query;

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
            total: count,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Fetch failed' },
            { status: 500 }
        );
    }
}
