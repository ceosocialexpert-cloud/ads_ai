// Vertex AI Gemini 3 Pro Image Preview integration
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.VERTEX_AI_PROJECT_ID || '';
const LOCATION = 'global'; // Gemini 3 Pro uses global location
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Log configuration on module load
console.log('🔧 Imagen module initialized:');
console.log('  PROJECT_ID:', PROJECT_ID || '❌ MISSING');
console.log('  LOCATION:', LOCATION);
console.log('  GOOGLE_APPLICATION_CREDENTIALS:', CREDENTIALS_PATH || '❌ MISSING');

// Get access token
async function getAccessToken() {
    const fs = await import('fs');
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH!, 'utf-8'));
    
    const auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
        throw new Error('Failed to get access token');
    }
    
    return accessToken.token;
}

export interface GenerateImageParams {
    prompt: string;
    negativePrompt?: string;
    referenceImages?: {
        template?: string; // base64
        logo?: string; // base64
        person?: string; // base64
    };
    aspectRatio?: string; // e.g., "1:1", "16:9", "9:16"
    numberOfImages?: number;
}

export async function generateImageWithImagen(params: GenerateImageParams): Promise<string[]> {
    const {
        prompt,
        negativePrompt,
        referenceImages,
        aspectRatio = '1:1',
        numberOfImages = 1,
    } = params;

    // Validate configuration
    if (!PROJECT_ID) {
        throw new Error('❌ VERTEX_AI_PROJECT_ID is not configured in environment variables');
    }

    if (!CREDENTIALS_PATH) {
        throw new Error('❌ GOOGLE_APPLICATION_CREDENTIALS is not configured in environment variables');
    }

    try {
        console.log('🔍 Calling Gemini 3 Pro Image Preview with params:', {
            prompt: prompt.substring(0, 100) + '...',
            aspectRatio,
            numberOfImages,
            hasNegativePrompt: !!negativePrompt,
            hasTemplate: !!referenceImages?.template,
            hasLogo: !!referenceImages?.logo,
            hasPerson: !!referenceImages?.person,
            projectId: PROJECT_ID,
            location: LOCATION,
        });

        // Gemini 3 Pro generates only 1 image per call, so we need to call it multiple times
        const allGeneratedImages: string[] = [];
        
        for (let i = 0; i < numberOfImages; i++) {
            console.log(`📸 Generating image ${i + 1}/${numberOfImages}...`);
            
            // Get access token for each call
            const token = await getAccessToken();
            
            // Build prompt with negative prompt if provided
            let fullPrompt = prompt;
            if (negativePrompt) {
                fullPrompt += `\n\nNegative prompt (avoid these): ${negativePrompt}`;
            }

            // Gemini 3 Pro Image Preview endpoint
            const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-3-pro-image-preview:generateContent`;
            
            if (i === 0) {
                console.log('📡 Calling endpoint:', endpoint);
            }

            // Build request body
            // Prepare parts array with text and optional reference images
            const parts: any[] = [];
            
            // Add reference images first if available
            if (referenceImages?.template) {
                parts.push({
                    text: 'Шаблон / Фон:'
                });
                parts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: referenceImages.template
                    }
                });
            }
            
            if (referenceImages?.logo) {
                parts.push({
                    text: 'Логотип:'
                });
                parts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: referenceImages.logo
                    }
                });
            }
            
            if (referenceImages?.person) {
                parts.push({
                    text: 'Людина / Товар:'
                });
                parts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: referenceImages.person
                    }
                });
            }
            
            // Add variation hint for multiple images
            if (numberOfImages > 1) {
                fullPrompt += `\n\n[Варіант ${i + 1} з ${numberOfImages}. Створіть унікальний варіант дизайну.]`;
            }
            
            // Add main prompt
            parts.push({ text: fullPrompt });
            
            const requestBody = {
                contents: {
                    role: 'user',
                    parts: parts
                },
                generation_config: {
                    response_modalities: ['IMAGE'],
                    image_config: {
                        aspect_ratio: aspectRatio,
                        image_size: '1K' // 1024x1024 or equivalent based on aspect ratio
                    }
                }
            };

            if (i === 0) {
                console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
            }

            // Call Gemini API
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ Image ${i + 1}/${numberOfImages} generated`);
            
            // Extract image from response
            if (data.candidates && Array.isArray(data.candidates)) {
                for (const candidate of data.candidates) {
                    if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts)) {
                        for (const part of candidate.content.parts) {
                            // Try different possible structures (Gemini uses camelCase)
                            if (part.image && part.image.imageBytes) {
                                allGeneratedImages.push(part.image.imageBytes);
                            } else if (part.inlineData && part.inlineData.data) {
                                allGeneratedImages.push(part.inlineData.data);
                            } else if (part.inline_data && part.inline_data.data) {
                                allGeneratedImages.push(part.inline_data.data);
                            }
                        }
                    }
                }
            }
            
            // Add small delay between requests to avoid rate limiting
            if (i < numberOfImages - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (allGeneratedImages.length === 0) {
            throw new Error('No images generated in response');
        }

        console.log(`✅ Successfully generated ${allGeneratedImages.length} image(s)`);
        return allGeneratedImages;
        
    } catch (error) {
        console.error('❌ Imagen generation error:', error);
        throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function getAspectRatioFromSize(sizeId: string): string {
    // Якщо це вже формат пікселів (наприклад "1080x1920"), конвертуємо в співвідношення
    if (sizeId.includes('x')) {
        const [width, height] = sizeId.split('x').map(Number);
        
        // Обчислюємо співвідношення
        if (width === height) {
            return '1:1';
        } else if (width < height) {
            // Вертикальні формати
            const ratio = height / width;
            if (Math.abs(ratio - 16/9) < 0.1) return '9:16';
            if (Math.abs(ratio - 5/4) < 0.1) return '4:5';
            return '9:16'; // За замовчуванням для вертикальних
        } else {
            // Горизонтальні формати
            const ratio = width / height;
            if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
            return '16:9'; // За замовчуванням для горизонтальних
        }
    }
    
    // Якщо це ID розміру, використовуємо мапу
    const aspectRatioMap: Record<string, string> = {
        'instagram-square': '1:1',
        'instagram-story': '9:16',
        'instagram-reel': '9:16',
        'facebook-feed': '1:1',
        'facebook-story': '9:16',
        'landscape': '16:9',
        'portrait': '4:5',
    };
    
    return aspectRatioMap[sizeId] || '1:1';
}
