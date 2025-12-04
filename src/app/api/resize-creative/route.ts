import { NextRequest, NextResponse } from 'next/server';
import { generateImageWithImagen, getAspectRatioFromSize } from '@/lib/imagen';
import { getServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { imageBase64, targetSize, sessionId, projectId, projectName, targetAudience } = await request.json();

        if (!imageBase64 || !targetSize || !sessionId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        console.log(`📐 Resizing image to ${targetSize}...`);

        // Get aspect ratio info
        const aspectRatio = getAspectRatioFromSize(targetSize);
        const isStories = aspectRatio === '9:16';

        // Create prompt for Gemini to recreate the image in different size
        let prompt = `Recreate this exact same advertising banner/creative in the NEW size: ${targetSize}.

CRITICAL REQUIREMENTS:
1. Keep EXACTLY the same:
   - All text content (word for word, character for character)
   - All visual elements (images, graphics, logos)
   - Color scheme and style
   - Brand identity and messaging
   - Layout composition (adapt proportions to new aspect ratio)

2. Adapt ONLY the layout to fit the new ${targetSize} dimensions:
   - Reposition elements to fit the new aspect ratio
   - Maintain visual balance and hierarchy
   - Ensure all text remains readable
   - Keep the same design language
`;

        // Add special instructions for Stories format
        if (isStories) {
            prompt += `\n🚨 CRITICAL STORIES FORMAT REQUIREMENTS (1080x1920):
`;
            prompt += `- SAFE ZONE: Keep ALL TEXT and IMPORTANT ELEMENTS within the central area\n`;
            prompt += `- TOP 250 PIXELS: DO NOT place any text or important content (Instagram/Facebook interface)\n`;
            prompt += `- BOTTOM 250 PIXELS: DO NOT place any text or important content (Instagram/Facebook interface)\n`;
            prompt += `- SAFE CONTENT AREA: Only pixels 250-1670 (vertical) are guaranteed visible\n`;
            prompt += `- Text and logo MUST be centered vertically in the safe zone\n`;
            prompt += `- Background/visuals can fill the entire 1080x1920 canvas\n\n`;
        }

        prompt += `\n3. Output specifications:
   - Size: ${targetSize} pixels
   - Same quality and resolution as original
   - Professional advertising standard

DO NOT change any content, text, or visual elements - ONLY adapt the layout to the new dimensions.`;

        console.log('🎯 Resize params:');
        console.log('  targetSize:', targetSize);
        console.log('  aspectRatio:', aspectRatio);
        console.log('  isStories:', isStories);

        const resizedImages = await generateImageWithImagen({
            prompt,
            aspectRatio,
            numberOfImages: 1,
            referenceImages: {
                template: imageBase64 // Send original image as reference
            }
        });

        if (!resizedImages || resizedImages.length === 0) {
            throw new Error('Failed to generate resized image');
        }

        console.log(`✅ Image resized successfully to ${targetSize}`);

        // Save resized creative to database
        const supabase = getServerSupabase();
        const { data: savedCreative, error: saveError } = await supabase
            .from('generated_creatives')
            .insert({
                project_id: projectId || null,
                project_name: projectName || 'Ресайз',
                session_id: sessionId,
                target_audience: targetAudience || 'Ресайз',
                format: 'resize',
                size: targetSize,
                image_url: resizedImages[0],
                prompt_used: prompt.substring(0, 500),
            })
            .select()
            .single();

        if (saveError) {
            console.error('Failed to save resized creative:', saveError);
            // Don't fail the request if save fails
        } else {
            console.log('💾 Resized creative saved to gallery');
        }

        return NextResponse.json({
            success: true,
            resizedImage: resizedImages[0],
            size: targetSize,
            creative: savedCreative || null,
        });
    } catch (error) {
        console.error('Resize error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Resize failed',
                details: error instanceof Error ? error.stack : String(error)
            },
            { status: 500 }
        );
    }
}
