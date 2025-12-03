import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const projectId = params.id;
        const body = await request.json();
        const { name, url, language, icon } = body;

        console.log('Update project request:', { projectId, name, url, language, hasIcon: !!icon });

        const supabase = getServerSupabase();

        const updateData: any = {
            name: name,
            url: url,
        };

        if (language) {
            updateData.language = language;
        }

        if (icon) {
            updateData.screenshot_url = icon;
        }

        console.log('Update data:', updateData);

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', projectId)
            .select()
            .single();

        if (error) {
            console.error('Supabase update error:', error);
            return NextResponse.json(
                { error: 'Failed to update project: ' + error.message },
                { status: 500 }
            );
        }

        console.log('Project updated successfully:', data);

        return NextResponse.json({
            success: true,
            project: data,
        });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Update failed' },
            { status: 500 }
        );
    }
}
