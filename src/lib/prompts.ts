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
    userSpecifiedText?: string; // Текст, який користувач явно вказав для креативу
}

export function buildCreativePrompt(context: PromptContext): string {
    const { projectSummary, keyFeatures, brandVoice, targetAudience, format, referenceImages, referenceDescription, userSpecifiedText } = context;

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
Pain Points: ${targetAudience.pain_points?.join(', ') || 'Не вказано'}
Needs: ${targetAudience.needs?.join(', ') || 'Не вказано'}
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
- Highlight how they relate to the audience's needs: ${targetAudience.needs?.join(', ') || 'Загальні потреби'}
- 🧑 ETHNICITY DEFAULT: If people are shown, use Slavic (Eastern European) appearance by default unless explicitly specified otherwise\n`;
            }

            if (referenceImages.logo && referenceImages.logo.length > 0) {
                prompt += `\n🏬 LOGO/BRAND (${referenceImages.logo.length} image(s)):
- Incorporate these logos or brand elements into the creative
- Place strategically - visible but not overwhelming
- Ensure brand identity is clear while maintaining design balance\n`;
            } else {
                prompt += `\n🚫 NO LOGO PROVIDED:
- DO NOT create or add any fictional/placeholder logos
- DO NOT add any brand marks unless provided by user
- Leave branding space empty or use design elements only\n`;
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

    // CRITICAL: Handle user-specified text
    if (userSpecifiedText) {
        prompt += `\n‼️ USER-SPECIFIED TEXT (MANDATORY):\n`;
        prompt += `The user has explicitly provided the following text for this creative:\n`;
        prompt += `"${userSpecifiedText}"\n`;
        prompt += `\n🚨 TEXT GENERATION RULE:\n`;
        prompt += `- USE ONLY the text provided above\n`;
        prompt += `- DO NOT add any additional headlines, slogans, or copy\n`;
        prompt += `- DO NOT create text variations or alternatives\n`;
        prompt += `- DO NOT add call-to-actions unless specified by user\n`;
        prompt += `- The creative must contain EXACTLY this text and nothing more\n\n`;
    } else {
        prompt += `\n📝 TEXT GENERATION (ALLOWED):\n`;
        prompt += `- Generate appropriate headlines and copy for ${targetAudience.name}\n`;
        prompt += `- Create compelling call-to-actions\n`;
        prompt += `- Adapt messaging to audience needs and pain points\n\n`;
    }

    prompt += `\nSTYLE REQUIREMENTS:
- High-quality, professional design
- Eye-catching and engaging for ${targetAudience.name}
- Clear visual hierarchy
- Mobile-optimized
- Brand-appropriate colors and aesthetics
- Visual elements that directly address the pain points and needs of ${targetAudience.name}
- 🧑 PEOPLE APPEARANCE: If people are featured, use Slavic (Eastern European) ethnicity by default unless user explicitly requests otherwise
- 🚫 LOGO RULE: Only include logos if provided by user - DO NOT create fictional logos

🎯 FINAL REMINDER: This creative is specifically for ${targetAudience.name}. Every element should speak to their needs (${targetAudience.needs?.join(', ') || 'загальні потреби'}) and address their pain points (${targetAudience.pain_points?.join(', ') || 'загальні проблеми'}).`;

    if (userSpecifiedText) {
        prompt += ` ‼️ TEXT RULE: Use ONLY the user-provided text: "${userSpecifiedText}". Do NOT add any other text content.`;
    }

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

// Generate creative prompt for image generation API
export interface CreativePromptParams {
    projectName?: string;
    projectDescription?: string;
    audienceName: string;
    audienceDescription: string;
    painPoints: string[];
    needs: string[];
    demographics: any;
    size: string;
    hasTemplate: boolean;
    hasLogo: boolean;
    hasPerson: boolean;
    language?: string; // Language code: uk, ru, en
    userSpecifiedText?: string; // User's explicit text for the creative
}

export function generateCreativePrompt(params: CreativePromptParams): string {
    const {
        projectName,
        projectDescription,
        audienceName,
        audienceDescription,
        painPoints,
        needs,
        demographics,
        size,
        hasTemplate,
        hasLogo,
        hasPerson,
        language = 'uk',
        userSpecifiedText,
    } = params;

    const sizeInfo = SIZE_OPTIONS.find(s => s.id === size);
    const dimensions = sizeInfo?.dimensions || '1080x1080';
    
    // Language mapping for instructions
    const languageNames: Record<string, string> = {
        'uk': 'Ukrainian (Українська)',
        'ru': 'Russian (Русский)',
        'en': 'English',
    };
    
    const languageName = languageNames[language] || languageNames['uk'];

    let prompt = `Create a professional advertising creative for social media.

`;
    
    // CRITICAL: Language requirement at the very beginning
    prompt += `‼️ CRITICAL LANGUAGE REQUIREMENT:
`;
    prompt += `ALL TEXT in this creative MUST be EXCLUSIVELY in ${languageName}.
`;
    prompt += `Language code: ${language}
`;
    prompt += `Do NOT use any other language. Every word, headline, description, and call-to-action MUST be in ${languageName}.

`;

    if (projectName) {
        prompt += `PROJECT: ${projectName}\n`;
    }
    if (projectDescription) {
        prompt += `DESCRIPTION: ${projectDescription}\n`;
    }

    prompt += `\n🎯 TARGET AUDIENCE (CRITICAL - ALL CONTENT MUST BE ADAPTED FOR THIS AUDIENCE):\n`;
    prompt += `Name: ${audienceName}\n`;
    prompt += `Description: ${audienceDescription}\n`;
    prompt += `Pain Points: ${painPoints?.join(', ') || 'Не вказано'}\n`;
    prompt += `Needs: ${needs?.join(', ') || 'Не вказано'}\n`;
    if (demographics) {
        prompt += `Demographics: Age ${demographics.age || 'N/A'}, ${demographics.gender || 'all genders'}, ${demographics.location || 'any location'}\n`;
    }

    prompt += `\nCREATIVE FORMAT: ${dimensions} (${sizeInfo?.ratio || '1:1'})\n`;
    
    // Add special instructions for Stories format (9:16)
    if (sizeInfo?.ratio === '9:16') {
        prompt += `\n🚨🚨🚨 CRITICAL STORIES FORMAT REQUIREMENTS (1080x1920) - MANDATORY:\n`;
        prompt += `\n⛔ FORBIDDEN ZONES (NO TEXT, NO LOGOS, NO IMPORTANT CONTENT):\n`;
        prompt += `- TOP 250 PIXELS (0-250px from top): ABSOLUTELY NO text, logos, or important elements\n`;
        prompt += `- BOTTOM 250 PIXELS (1670-1920px from top): ABSOLUTELY NO text, logos, or important elements\n`;
        prompt += `\n✅ SAFE ZONE FOR TEXT AND LOGOS:\n`;
        prompt += `- ONLY use vertical area between 250px and 1670px (1420px height)\n`;
        prompt += `- ALL TEXT must be placed in this safe zone\n`;
        prompt += `- ALL LOGOS must be placed in this safe zone\n`;
        prompt += `- Main headline: Place around 400-800px from top\n`;
        prompt += `- Logo: Place around 300-500px from top or 900-1200px from top\n`;
        prompt += `- Call-to-action: Place around 1400-1600px from top\n`;
        prompt += `\n📐 LAYOUT RULES:\n`;
        prompt += `- Background/visuals: Can fill the entire 1080x1920 canvas\n`;
        prompt += `- Text and logos: STRICTLY between pixels 250-1670 only\n`;
        prompt += `- Center content vertically within the safe zone\n`;
        prompt += `- This is for Instagram/Facebook Stories - interface covers top and bottom\n\n`;
    }

    if (hasTemplate || hasLogo || hasPerson) {
        prompt += `\n📸 REFERENCE IMAGES PROVIDED:\n`;

        if (hasTemplate) {
            prompt += `\n🎨 TEMPLATE/BACKGROUND:\n`;
            prompt += `- Use this image as the base template and background style\n`;
            prompt += `- Maintain the visual aesthetic, color palette, and layout structure\n`;
            prompt += `- This is the FOUNDATION of the creative\n`;
        }

        if (hasPerson) {
            prompt += `\n👤 PERSON/SUBJECT:\n`;
            prompt += `- Feature this person/product prominently in the creative\n`;
            prompt += `- Place them naturally within the template\n`;
            prompt += `- Show them in a way that appeals to ${audienceName}\n`;
            prompt += `- Highlight how they relate to the audience's needs\n`;
            prompt += `- 🧑 ETHNICITY DEFAULT: If people are shown, use Slavic (Eastern European) appearance by default\n`;
            prompt += `- Only use different ethnicity if explicitly requested by the user\n`;
        }

        if (hasLogo) {
            prompt += `\n🏬 LOGO/BRAND:\n`;
            prompt += `- Incorporate this logo into the creative\n`;
            prompt += `- Place strategically - visible but not overwhelming\n`;
            prompt += `- Ensure brand identity is clear\n`;
            if (sizeInfo?.ratio === '9:16') {
                prompt += `- ⚠️ STORIES: Logo MUST be between 250-1670px vertically (safe zone only)\n`;
            }
        } else {
            prompt += `\n🚫 NO LOGO PROVIDED:\n`;
            prompt += `- DO NOT create or add any fictional/placeholder logos\n`;
            prompt += `- DO NOT add any brand marks unless provided by user\n`;
            prompt += `- Leave branding space empty or use design elements only\n`;
        }

        prompt += `\n⚠️ COMPOSITION INSTRUCTION:\n`;
        prompt += `1. START with the template as the foundation\n`;
        prompt += `2. LAYER the person/subject as the main focal point\n`;
        prompt += `3. ADD the logo in an appropriate location\n`;
        prompt += `4. ENSURE everything works together cohesively\n`;
        prompt += `5. ADAPT the overall feel to target ${audienceName}\n`;
    }

    // CRITICAL: Handle user-specified text
    if (userSpecifiedText) {
        prompt += `\n‼️ USER-SPECIFIED TEXT (MANDATORY):\n`;
        prompt += `The user has explicitly provided the following text for this creative:\n`;
        prompt += `"${userSpecifiedText}"\n`;
        prompt += `\n🚨 TEXT GENERATION RULE:\n`;
        prompt += `- USE ONLY the text provided above\n`;
        prompt += `- DO NOT add any additional headlines, slogans, or copy\n`;
        prompt += `- DO NOT create text variations or alternatives\n`;
        prompt += `- DO NOT add call-to-actions unless specified by user\n`;
        prompt += `- The creative must contain EXACTLY this text and nothing more\n\n`;
    } else {
        prompt += `\n📝 TEXT GENERATION (ALLOWED):\n`;
        prompt += `- Generate appropriate headlines and copy for ${audienceName}\n`;
        prompt += `- Create compelling call-to-actions\n`;
        prompt += `- Adapt messaging to audience needs and pain points\n\n`;
    }

    prompt += `\nSTYLE REQUIREMENTS:\n`;
    prompt += `- High-quality, professional advertising design\n`;
    prompt += `- Eye-catching and engaging for ${audienceName}\n`;
    prompt += `- Clear visual hierarchy\n`;
    prompt += `- Mobile-optimized for social media\n`;
    if (painPoints && painPoints.length > 0) {
        prompt += `- Visual elements that address pain points: ${painPoints.join(', ')}\n`;
    }
    if (needs && needs.length > 0) {
        prompt += `- Appeal to needs: ${needs.join(', ')}\n`;
    }
    prompt += `- **ALL TEXT MUST BE IN ${languageName} (${language})**\n`;
    prompt += `- 🧑 PEOPLE APPEARANCE: If people are featured, use Slavic (Eastern European) ethnicity by default unless user explicitly requests otherwise\n`;
    prompt += `- 🚫 LOGO RULE: Only include logos if provided by user - DO NOT create fictional logos\n`;
    if (sizeInfo?.ratio === '9:16') {
        prompt += `- ⚠️ STORIES SAFE ZONE: ALL text and logos MUST be between 250-1670px vertically\n`;
    }

    if (userSpecifiedText) {
        prompt += `\n🎯 FINAL REMINDER: This creative is for ${audienceName}. Use ONLY the user-provided text: "${userSpecifiedText}". Do NOT add any other text. All text must be in ${languageName} only!`;
    } else {
        prompt += `\n🎯 FINAL REMINDER: This creative is specifically for ${audienceName}. Every element should speak to their needs and address their pain points. Generate compelling text in ${languageName} only!`;
    }

    return prompt;
}
