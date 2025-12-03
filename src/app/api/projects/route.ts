import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const projectId = searchParams.get('projectId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        // If projectId is provided, return specific project with its target audiences
        if (projectId) {
            // Get project details
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError || !project) {
                return NextResponse.json(
                    { error: 'Project not found' },
                    { status: 404 }
                );
            }

            // Get target audiences for this project
            const { data: audiences, error: audiencesError } = await supabase
                .from('target_audiences')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: true });

            if (audiencesError) {
                console.error('Failed to fetch target audiences:', audiencesError);
                // Continue without audiences if fetch fails
            }

            return NextResponse.json({
                success: true,
                project: {
                    ...project,
                    target_audiences: audiences || project.target_audiences || []
                }
            });
        }

        // Otherwise return list of projects for this session
        const { data: projects, error } = await supabase
            .from('projects')
            .select('id, name, url, description, created_at')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch projects' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            projects,
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
        const { sessionId, name, url, icon } = body;

        if (!sessionId || !name) {
            return NextResponse.json(
                { error: 'Session ID and name are required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        // Create new project
        const { data: project, error } = await supabase
            .from('projects')
            .insert({
                session_id: sessionId,
                name: name,
                url: url || null,
                description: null,
                screenshot_url: icon || null, // Store icon as screenshot_url for now
                analysis_result: null,
            })
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to create project' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            project,
        });
    } catch (error) {
        console.error('Create error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Create failed' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        // Delete project (cascades to target_audiences)
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to delete project' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        );
    }
}