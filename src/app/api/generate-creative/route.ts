import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { generateCreativePrompt } from '@/lib/prompts';
import { generateImageWithImagen, getAspectRatioFromSize } from '@/lib/imagen';

// Convert File/Blob to base64
async function fileToBase64(file: File | Blob): Promise<string> {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return base64;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        
        const projectId = formData.get('projectId') as string;
        const audienceId = formData.get('audienceId') as string;
        const size = formData.get('size') as string;
        const quantity = parseInt(formData.get('quantity') as string) || 1;
        
        const templateFiles = formData.getAll('templateFiles') as File[];
        const logoFiles = formData.getAll('logoFiles') as File[];
        const personFiles = formData.getAll('personFiles') as File[];

        if (!projectId || !audienceId) {
            return NextResponse.json(
                { error: 'Project ID and Audience ID are required' },
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
        const { data: audience, error: audienceError } = await supabase
            .from('target_audiences')
            .select('*')
            .eq('id', audienceId)
            .single();

        if (audienceError || !audience) {
            return NextResponse.json(
                { error: 'Target audience not found' },
                { status: 404 }
            );
        }

        // Convert images to base64
        const templateBase64 = templateFiles.length > 0 
            ? await fileToBase64(templateFiles[0]) 
            : null;
        const logoBase64 = logoFiles.length > 0 
            ? await fileToBase64(logoFiles[0]) 
            : null;
        const personBase64 = personFiles.length > 0 
            ? await fileToBase64(personFiles[0]) 
            : null;

        // Generate prompt
        const prompt = generateCreativePrompt({
            projectName: project.name,
            projectDescription: project.description,
            audienceName: audience.name,
            audienceDescription: audience.description,
            painPoints: audience.pain_points,
            needs: audience.needs,
            demographics: audience.demographics,
            size,
            hasTemplate: !!templateBase64,
            hasLogo: !!logoBase64,
            hasPerson: !!personBase64,
            language: project.language || 'uk', // Pass project language
        });

        console.log('Generated prompt:', prompt);

        // Get aspect ratio for the selected size
        const aspectRatio = getAspectRatioFromSize(size);

        // Generate image using Vertex AI Gemini 3 Pro Image Preview
        const generatedImages = await generateImageWithImagen({
            prompt,
            aspectRatio,
            numberOfImages: quantity,
            referenceImages: {
                template: templateBase64 || undefined,
                logo: logoBase64 || undefined,
                person: personBase64 || undefined,
            },
        });

        if (!generatedImages || generatedImages.length === 0) {
            throw new Error('No images were generated');
        }

       console.log(`Successfully generated ${generatedImages.length} image(s)`);

        // Save each generated image to database (gallery)
        const savedCreatives = [];
        for (let i = 0; i < generatedImages.length; i++) {
            const imageBase64 = generatedImages[i];
            const imageDataUrl = `data:image/png;base64,${imageBase64}`;
            
            const { data: savedCreative, error: saveError } = await supabase
                .from('generated_creatives')
                .insert({
                    project_id: projectId,
                    session_id: formData.get('sessionId') || 'default',
                    target_audience: audience.name,
                    format: 'square', // or get from size
                    size: size,
                    image_url: imageDataUrl, // Store as data URL for now
                    prompt_used: prompt,
                    reference_images: {
                        template: !!templateBase64,
                        logo: !!logoBase64,
                        person: !!personBase64,
                    },
                })
                .select()
                .single();

            if (saveError) {
                console.error('Failed to save creative:', saveError);
            } else {
                savedCreatives.push(savedCreative);
            }
        }

        // Save generation result to chat history
        const sessionId = formData.get('sessionId') as string || 'default';
        
        // Save message with ALL generated images in metadata
        await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: `✅ Згенеровано ${generatedImages.length} креатив(ів) для "${audience.name}"`,
            metadata: {
                type: 'generated_creative',
                images: generatedImages, // All images
                image: generatedImages[0], // First image for backward compatibility
                creativeIds: savedCreatives.map(c => c.id),
                prompt: prompt,
                size: size,
                quantity: generatedImages.length,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Creative generation completed',
            prompt,
            image: generatedImages[0], // base64
            images: generatedImages, // all generated images
            creatives: savedCreatives, // saved creative records
            details: {
                project: project.name,
                audience: audience.name,
                size,
                quantity: generatedImages.length,
                aspectRatio,
            },
        });

    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Generation failed',
                details: error instanceof Error ? error.stack : String(error)
            },
            { status: 500 }
        );
    }
}
