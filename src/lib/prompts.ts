import { TargetAudience } from './supabase';

export interface ReferenceImage {
    base64: string;
    type: 'style' | 'logo' | 'subject';
}

export interface ReferenceImages {
    template?: ReferenceImage[];
    personProduct?: ReferenceImage[];
    logo?: ReferenceImage[];
}

export interface PromptContext {
    projectSummary: string;
    keyFeatures: string[];
    brandVoice: string;
    targetAudience: TargetAudience;
    format: string;
    referenceImages?: ReferenceImages;
    referenceDescription?: string;
}

export function buildCreativePrompt(context: PromptContext): string {
    const { projectSummary, keyFeatures, brandVoice, targetAudience, format, referenceImages, referenceDescription } = context;

    const formatInstructions = getFormatInstructions(format);

    let prompt = `Create a professional advertising creative for social media (Facebook/Instagram).

PROJECT CONTEXT:
${projectSummary}

KEY FEATURES:
${keyFeatures.map(f => `- ${f}`).join('\n')}

BRAND VOICE: ${brandVoice}

🎯 PRIMARY TARGET AUDIENCE (CRITICAL - ALL CONTENT MUST BE ADAPTED FOR THIS AUDIENCE):
Name: ${targetAudience.name}
Description: ${targetAudience.description}
Pain Points: ${targetAudience.pain_points.join(', ')}
Needs: ${targetAudience.needs.join(', ')}
Demographics: ${targetAudience.demographics || 'Not specified'}

CREATIVE FORMAT: ${formatInstructions}
`;

    // Handle reference images with new structure
    if (referenceImages) {
        const hasAnyImages = 
            (referenceImages.template && referenceImages.template.length > 0) ||
            (referenceImages.personProduct && referenceImages.personProduct.length > 0) ||
            (referenceImages.logo && referenceImages.logo.length > 0);

        if (hasAnyImages) {
            prompt += `\n📸 REFERENCE IMAGES PROVIDED:\n`;

            if (referenceImages.template && referenceImages.template.length > 0) {
                prompt += `\n🎨 TEMPLATE/BACKGROUND (${referenceImages.template.length} image(s)):
- Use these images as a template or background style
- Extract the visual style, color palette, composition, and layout structure
- This is the BASE/FOUNDATION for the creative
- Maintain the overall aesthetic while adapting for the target audience\n`;
            }

            if (referenceImages.personProduct && referenceImages.personProduct.length > 0) {
                prompt += `\n👤 PERSON/PRODUCT (${referenceImages.personProduct.length} image(s)):
- Feature these people, speakers, or products prominently in the creative
- Place them naturally within the template/background
- Show them in a way that appeals to ${targetAudience.name}
- Highlight how they relate to the audience's needs: ${targetAudience.needs.join(', ')}\n`;
            }

            if (referenceImages.logo && referenceImages.logo.length > 0) {
                prompt += `\n🏬 LOGO/BRAND (${referenceImages.logo.length} image(s)):
- Incorporate these logos or brand elements into the creative
- Place strategically - visible but not overwhelming
- Ensure brand identity is clear while maintaining design balance\n`;
            }

            prompt += `\n⚠️ COMPOSITION INSTRUCTION:
1. START with the template/background style as the foundation
2. LAYER the person/product as the main focal point
3. ADD the logo/brand elements in appropriate locations
4. ENSURE everything works together cohesively
5. ADAPT the overall feel to specifically target ${targetAudience.name}\n`;
        }
    }

    if (referenceDescription) {
        prompt += `\nADDITIONAL STYLE NOTES: ${referenceDescription}\n`;
    }

    prompt += `\nSTYLE REQUIREMENTS:
- High-quality, professional design
- Eye-catching and engaging for ${targetAudience.name}
- Clear visual hierarchy
- Mobile-optimized
- Brand-appropriate colors and aesthetics
- Visual elements that directly address the pain points and needs of ${targetAudience.name}

🎯 FINAL REMINDER: This creative is specifically for ${targetAudience.name}. Every element should speak to their needs (${targetAudience.needs.join(', ')}) and address their pain points (${targetAudience.pain_points.join(', ')}).`;

    return prompt;
}

function getFormatInstructions(format: string): string {
    const formatMap: Record<string, string> = {
        'before-after': 'Split-screen design showing "before" and "after" transformation. Clear visual contrast between the two states.',
        'testimonial': 'Customer testimonial format with a photo/avatar, quote, and name. Professional and trustworthy design.',
        'ugc': 'User-generated content style - authentic, relatable, and natural-looking. Should feel like real user content.',
        'product-demo': 'Product demonstration showing the product in use or highlighting key features. Clear and informative.',
        'lifestyle': 'Lifestyle imagery showing the product/service in real-life context. Aspirational and relatable.',
        'problem-solution': 'Visual representation of a problem and how the product/service solves it. Clear narrative flow.',
        'stat-highlight': 'Data-driven design highlighting impressive statistics or results. Bold numbers and clean layout.',
        'comparison': 'Side-by-side comparison with competitors or alternatives. Clear differentiation.',
        'announcement': 'New product/feature announcement. Exciting and attention-grabbing.',
        'seasonal': 'Seasonal or holiday-themed creative. Timely and relevant.',
    };

    return formatMap[format] || 'Standard advertising creative with clear value proposition and call-to-action.';
}

export function buildNegativePrompt(): string {
    return 'low quality, blurry, pixelated, distorted, ugly, bad anatomy, bad proportions, watermark, text errors, spelling mistakes, unprofessional, cluttered, messy, poor composition';
}

export const CREATIVE_FORMATS = [
    { id: 'before-after', name: 'До/Після', description: 'Демонстрація трансформації' },
    { id: 'testimonial', name: 'Відгук', description: 'Відгук клієнта' },
    { id: 'ugc', name: 'UGC', description: 'User-generated content' },
    { id: 'product-demo', name: 'Демонстрація продукту', description: 'Показ продукту в дії' },
    { id: 'lifestyle', name: 'Lifestyle', description: 'Продукт у житті' },
    { id: 'problem-solution', name: 'Проблема-Рішення', description: 'Як продукт вирішує проблему' },
    { id: 'stat-highlight', name: 'Статистика', description: 'Виділення цифр та результатів' },
    { id: 'comparison', name: 'Порівняння', description: 'Порівняння з конкурентами' },
    { id: 'announcement', name: 'Анонс', description: 'Новий продукт/функція' },
    { id: 'seasonal', name: 'Сезонний', description: 'Святковий/сезонний креатив' },
];

export const SIZE_OPTIONS = [
    { id: 'instagram-square', name: 'Instagram Квадрат', dimensions: '1080x1080', ratio: '1:1' },
    { id: 'instagram-story', name: 'Instagram Stories', dimensions: '1080x1920', ratio: '9:16' },
    { id: 'instagram-reel', name: 'Instagram Reels', dimensions: '1080x1920', ratio: '9:16' },
    { id: 'facebook-feed', name: 'Facebook Feed', dimensions: '1080x1080', ratio: '1:1' },
    { id: 'facebook-story', name: 'Facebook Stories', dimensions: '1080x1920', ratio: '9:16' },
    { id: 'landscape', name: 'Landscape', dimensions: '1920x1080', ratio: '16:9' },
    { id: 'portrait', name: 'Portrait', dimensions: '1080x1350', ratio: '4:5' },
];
