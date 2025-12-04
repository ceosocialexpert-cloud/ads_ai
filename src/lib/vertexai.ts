import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSupabase } from './supabase';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = 'gemini-3-pro-image-preview';

export interface ReferenceImage {
    base64: string;
    type: 'style' | 'logo' | 'subject';
}

export interface GenerationParams {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    numberOfImages?: number;
    referenceImages?: ReferenceImage[];
}

export async function generateImage(params: GenerationParams): Promise<string[]> {
    const {
        prompt,
        negativePrompt = '',
        aspectRatio = '1:1',
        numberOfImages = 1,
        referenceImages = [],
    } = params;

    try {
        console.log('=== IMAGE GENERATION START ===');
        console.log('Base prompt:', prompt.substring(0, 300));
        console.log('Reference images count:', referenceImages.length);
        console.log('Aspect ratio:', aspectRatio);
        console.log('Number of images to generate:', numberOfImages);

        const allImageUrls: string[] = [];

        // Генеруємо кілька зображень в циклі
        for (let imageIndex = 0; imageIndex < numberOfImages; imageIndex++) {
            console.log(`\n--- Generating image ${imageIndex + 1}/${numberOfImages} ---`);

            const model = genAI.getGenerativeModel({ model: modelName });

            // Build multimodal content array
            const contentParts: any[] = [];

            // Add the main text prompt
            let textPrompt = prompt;

            if (negativePrompt) {
                textPrompt += `\n\nNegative prompt (avoid these): ${negativePrompt}`;
            }

            textPrompt += `\n\nAspect Ratio: ${aspectRatio}`;

            // Додаємо варіативність для кожного зображення
            if (numberOfImages > 1) {
                textPrompt += `\n\n⚡ VARIATION ${imageIndex + 1}: Create a unique variation with different visual elements, composition, or style while maintaining the core message and requirements.`;
            }

            textPrompt += `\n\nIMPORTANT: Generate a high-quality advertising image that matches ALL the requirements above.`;

            contentParts.push(textPrompt);

            // Add reference images directly to the generation request
            if (referenceImages.length > 0) {
                console.log('Adding reference images to generation request...');

                for (let i = 0; i < referenceImages.length; i++) {
                    const refImage = referenceImages[i];
                    console.log(`Adding reference image ${i + 1} (type: ${refImage.type})`);

                    // Add instruction before each image
                    let imageInstruction = '';
                    if (refImage.type === 'style') {
                        imageInstruction = `\n\n🎨 REFERENCE STYLE IMAGE ${i + 1}: Use the exact visual style, colors, typography, and layout from this image:`;
                    } else if (refImage.type === 'logo') {
                        imageInstruction = `\n\n🏷️ LOGO IMAGE ${i + 1}: Include this logo/brand element in the generated image:`;
                    } else {
                        imageInstruction = `\n\n👤 SUBJECT IMAGE ${i + 1}: Feature this subject/product in the generated image:`;
                    }

                    contentParts.push(imageInstruction);
                    contentParts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: refImage.base64,
                        },
                    });
                }
            }

            console.log('=== SENDING TO MODEL ===');
            console.log('Content parts:', contentParts.length);
            console.log('Text prompt:', textPrompt.substring(0, 200) + '...');

            const result = await model.generateContent(contentParts);
            const response = await result.response;

            console.log('Response received from model');

            const candidates = response.candidates;
            if (!candidates || candidates.length === 0) {
                console.error('No candidates in response');
                throw new Error('No candidates returned');
            }

            console.log('Candidates count:', candidates.length);

            // Обробляємо відповідь та зберігаємо зображення
            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];
                const responseParts = candidate.content?.parts;

                if (responseParts) {
                    console.log(`Candidate ${i + 1} has ${responseParts.length} parts`);

                    for (let j = 0; j < responseParts.length; j++) {
                        const part = responseParts[j];

                        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                            console.log(`Found image in candidate ${i + 1}, part ${j + 1}`);
                            const base64Image = part.inlineData.data;
                            const imageUrl = await uploadToStorage(base64Image);
                            allImageUrls.push(imageUrl);
                            console.log('Image uploaded:', imageUrl);
                        } else if (part.text) {
                            console.log(`Part ${j + 1} is text:`, part.text.substring(0, 100));
                        }
                    }
                }
            }

            console.log(`✅ Image ${imageIndex + 1}/${numberOfImages} generated`);
        }

        if (allImageUrls.length === 0) {
            console.error('No images found in response');
            throw new Error('No images generated in response');
        }

        console.log('=== IMAGE GENERATION COMPLETE ===');
        console.log('Total images generated:', allImageUrls.length);
        return allImageUrls;

    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

async function uploadToStorage(base64Image: string): Promise<string> {
    const supabase = getServerSupabase();

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Generate unique filename
    const filename = `generated/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from('creatives')
        .upload(filename, imageBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('creatives')
        .getPublicUrl(filename);

    return publicUrl;
}

export function getSizeFromFormat(format: string): { width: number; height: number } {
    const sizeMap: Record<string, { width: number; height: number }> = {
        'instagram-square': { width: 1080, height: 1080 },
        'instagram-story': { width: 1080, height: 1920 },
        'instagram-reel': { width: 1080, height: 1920 },
        'facebook-feed': { width: 1080, height: 1080 },
        'facebook-story': { width: 1080, height: 1920 },
        'landscape': { width: 1920, height: 1080 },
        'portrait': { width: 1080, height: 1350 },
    };

    return sizeMap[format] || { width: 1080, height: 1080 };
}
