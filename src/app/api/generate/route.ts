import { NextRequest, NextResponse } from 'next/server';
import { generateImage, getSizeFromFormat } from '@/lib/vertexai';
import { buildCreativePrompt, buildNegativePrompt } from '@/lib/prompts';
import { getServerSupabase, TargetAudience } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            sessionId,
            projectId,
            targetAudience,
            format,
            size,
            quantity = 1,
            referenceImages = [],
            referenceDescription,
        } = body;

        if (!sessionId || !projectId || !targetAudience || !format || !size) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

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

        // Find the selected target audience
        const selectedAudience = project.target_audiences?.find(
            (a: TargetAudience) => a.id === targetAudience
        );

        if (!selectedAudience) {
            return NextResponse.json(
                { error: 'Target audience not found' },
                { status: 404 }
            );
        }

        // Build prompt
        const prompt = buildCreativePrompt({
            projectSummary: project.analysis_result?.summary || '',
            keyFeatures: project.analysis_result?.key_features || [],
            brandVoice: project.analysis_result?.brand_voice || '',
            targetAudience: selectedAudience,
            format,
            referenceImages,
            referenceDescription,
        });

        const negativePrompt = buildNegativePrompt();

        // Convert size to aspect ratio string
        const aspectRatio = size.includes('story') || size.includes('reel') ? '9:16' : '1:1';

        // Generate images
        const imageUrls = await generateImage({
            prompt,
            negativePrompt,
            aspectRatio,
            numberOfImages: Math.min(quantity, 4),
            referenceImages,
        });

        // Save generated creatives to database
        const creatives = imageUrls.map(url => ({
            project_id: projectId,
            session_id: sessionId,
            target_audience: selectedAudience.name,
            format,
            size,
            image_url: url,
            prompt_used: prompt,
        }));

        const { data: savedCreatives, error: saveError } = await supabase
            .from('generated_creatives')
            .insert(creatives)
            .select();

        if (saveError) {
            console.error('Failed to save creatives:', saveError);
            // Still return the generated images even if saving fails
        }

        return NextResponse.json({
            success: true,
            creatives: savedCreatives || creatives,
            imageUrls,
        });
    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Generation failed' },
            { status: 500 }
        );
    }
}
