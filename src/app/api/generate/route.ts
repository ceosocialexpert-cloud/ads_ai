import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/vertexai';
import { buildCreativePrompt } from '@/lib/prompts';
import { getServerSupabase, TargetAudience } from '@/lib/supabase';
import { CREATIVE_FORMATS, SIZE_OPTIONS } from '@/lib/prompts';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            sessionId,
            projectId,
            targetAudience,
            targetAudienceDetails, // New parameter
            format,
            size,
            quantity = 1,
            referenceImages = [],
            referenceDescription,
        } = body;

        if (!sessionId || !projectId || (!targetAudience && !targetAudienceDetails)) {
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

        // Get target audience details
        let selectedAudience;
        if (targetAudienceDetails) {
            // Use provided audience details
            selectedAudience = targetAudienceDetails;
        } else {
            // Find the selected target audience from the project
            selectedAudience = project.target_audiences?.find(
                (a: TargetAudience) => a.id === targetAudience
            );
        }

        if (!selectedAudience) {
            return NextResponse.json(
                { error: 'Target audience not found' },
                { status: 404 }
            );
        }

        // Get format details
        const formatConfig = CREATIVE_FORMATS.find((f: any) => f.id === format);
        if (!formatConfig) {
            return NextResponse.json(
                { error: 'Invalid format' },
                { status: 400 }
            );
        }

        // Get size details
        const sizeConfig = SIZE_OPTIONS.find((s: any) => s.id === size);
        if (!sizeConfig) {
            return NextResponse.json(
                { error: 'Invalid size' },
                { status: 400 }
            );
        }

        // Build the prompt using the new prompt builder
        const promptContext: any = {
            projectSummary: project.analysis_result?.summary || 'Проект без опису',
            keyFeatures: project.analysis_result?.key_features || [],
            brandVoice: project.analysis_result?.brand_voice || 'Професійний',
            targetAudience: selectedAudience,
            format: format,
            referenceImages: {
                template: referenceImages.template || [],
                personProduct: referenceImages.personProduct || [],
                logo: referenceImages.logo || [],
            },
            referenceDescription: referenceDescription || undefined,
        };

        const prompt = buildCreativePrompt(promptContext);

        // Prepare all reference images for Vertex AI
        const allReferenceImages = [
            ...(referenceImages.template || []),
            ...(referenceImages.personProduct || []),
            ...(referenceImages.logo || []),
        ];

        // Generate images using Vertex AI
        const generationParams: any = {
            prompt,
            aspectRatio: sizeConfig.ratio,
            numberOfImages: quantity,
            referenceImages: allReferenceImages.map((img: any) => ({
                base64: img.base64,
                type: img.type || 'style',
            })),
        };

        console.log('Generating images with prompt:', prompt.substring(0, 200) + '...');
        const imageUrls = await generateImage(generationParams);

        // Save generated creatives to database
        const creativesToInsert = imageUrls.map((imageUrl: string) => ({
            project_id: projectId,
            project_name: project.name || 'Проект без назви',
            session_id: sessionId,
            target_audience: selectedAudience.name,
            format: format,
            size: size,
            image_url: imageUrl,
            prompt_used: prompt,
            reference_images: allReferenceImages.length > 0 ? allReferenceImages.map((img: any) => img.base64) : null,
        }));

        const { data: insertedCreatives, error: insertError } = await supabase
            .from('generated_creatives')
            .insert(creativesToInsert)
            .select();

        if (insertError) {
            console.error('Failed to save creatives:', insertError);
            // Don't fail the whole request if saving fails
        }

        return NextResponse.json({
            success: true,
            imageUrls,
            creatives: insertedCreatives || [],
        });
    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Generation failed' },
            { status: 500 }
        );
    }
}
