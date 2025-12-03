import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const subprojectId = searchParams.get('subprojectId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        // If subprojectId is provided, return specific subproject with audiences
        if (subprojectId) {
            const { data: subproject, error: subprojectError } = await supabase
                .from('subprojects')
                .select('*')
                .eq('id', subprojectId)
                .single();

            if (subprojectError || !subproject) {
                return NextResponse.json(
                    { error: 'Subproject not found' },
                    { status: 404 }
                );
            }

            // Get target audiences for this subproject
            const { data: audiences, error: audiencesError } = await supabase
                .from('subproject_target_audiences')
                .select('*')
                .eq('subproject_id', subprojectId)
                .order('created_at', { ascending: true });

            if (audiencesError) {
                console.error('Failed to fetch audiences:', audiencesError);
            }

            return NextResponse.json({
                success: true,
                subproject: {
                    ...subproject,
                    target_audiences: audiences || []
                }
            });
        }

        // Otherwise return all subprojects for this project
        const { data: subprojects, error } = await supabase
            .from('subprojects')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch subprojects' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            subprojects: subprojects || [],
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Fetch failed' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, name, url, description, type, language } = body;

        if (!projectId || !name || !url) {
            return NextResponse.json(
                { error: 'Project ID, name, and URL are required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        const { data: subproject, error } = await supabase
            .from('subprojects')
            .insert({
                project_id: projectId,
                name: name,
                url: url,
                description: description || null,
                type: type || 'webinar',
                language: language || 'uk',
            })
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to create subproject' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            subproject: subproject,
        });
    } catch (error) {
        console.error('Create error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Create failed' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { subprojectId, name, url, description, type, language } = body;

        if (!subprojectId) {
            return NextResponse.json(
                { error: 'Subproject ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        const updateData: any = {};
        if (name) updateData.name = name;
        if (url) updateData.url = url;
        if (description !== undefined) updateData.description = description;
        if (type) updateData.type = type;
        if (language) updateData.language = language;

        const { data, error } = await supabase
            .from('subprojects')
            .update(updateData)
            .eq('id', subprojectId)
            .select()
            .single();

        if (error) {
            console.error('Update error:', error);
            return NextResponse.json(
                { error: 'Failed to update subproject' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            subproject: data,
        });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Update failed' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subprojectId = searchParams.get('subprojectId');

        if (!subprojectId) {
            return NextResponse.json(
                { error: 'Subproject ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        const { error } = await supabase
            .from('subprojects')
            .delete()
            .eq('id', subprojectId);

        if (error) {
            console.error('Delete error:', error);
            return NextResponse.json(
                { error: 'Failed to delete subproject' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Subproject deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        );
    }
}
