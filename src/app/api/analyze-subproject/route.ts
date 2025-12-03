import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSupabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Language-specific prompts for subproject analysis
const getSubprojectAnalysisPrompt = (websiteContent: string, subproject: any, language: string = 'uk') => {
    const typeTranslations: Record<string, Record<string, string>> = {
        uk: {
            webinar: 'вебінар',
            landing: 'лендінг',
            campaign: 'кампанія',
        },
        ru: {
            webinar: 'вебинар',
            landing: 'лендинг',
            campaign: 'кампания',
        },
        en: {
            webinar: 'webinar',
            landing: 'landing page',
            campaign: 'campaign',
        },
    };

    const typeText = typeTranslations[language]?.[subproject.type] || typeTranslations['uk'][subproject.type];

    const prompts: Record<string, string> = {
        uk: `
Проаналізуй веб-сторінку (вебінар/лендінг/кампанія) та визнач цільові аудиторії для рекламних креативів.

КОНТЕКСТ: Це під-проект типу "${subproject.type}" - ${subproject.name}

КОНТЕНТ СТОРІНКИ:
${websiteContent}

ЗАВДАННЯ:
1. Визнач 2-4 ключових сегментів цільової аудиторії для цього конкретного ${typeText}
2. Для КОЖНОГО сегменту визнач:
   - Назву сегменту (коротко, 2-4 слова)
   - Детальний опис (хто це, вік, інтереси, мотивація відвідати цей ${typeText})
   - 3-5 основних болів/проблем які вирішує цей ${typeText}
   - 3-5 потреб/бажань
   - Демографічні дані (вік, стать, локація, дохід)

3. Загальна інформація про ${typeText}:
   - Короткий опис (1-2 речення) - про що цей ${typeText}
   - Ключові особливості (3-5 пунктів) - що унікального пропонується
   - Тон голосу (professional/casual/friendly/luxury тощо)

ФОРМАТ ВІДПОВІДІ (JSON):
{
  "summary": "Короткий опис ${typeText}",
  "key_features": ["Особливість 1", "Особливість 2", "Особливість 3"],
  "brand_voice": "professional",
  "target_audiences": [
    {
      "name": "Назва сегменту",
      "description": "Детальний опис аудиторії",
      "pain_points": ["Біль 1", "Біль 2", "Біль 3"],
      "needs": ["Потреба 1", "Потреба 2", "Потреба 3"],
      "demographics": {
        "age": "25-40",
        "gender": "all/male/female",
        "location": "Україна, великі міста",
        "income": "середній/вище середнього"
      }
    }
  ]
}

Відповідай ТІЛЬКИ валідним JSON без додаткового тексту.`,

        ru: `
Проанализируй веб-страницу (вебинар/лендинг/кампания) и определи целевые аудитории для рекламных креативов.

КОНТЕКСТ: Это под-проект типа "${subproject.type}" - ${subproject.name}

КОНТЕНТ СТРАНИЦЫ:
${websiteContent}

ЗАДАЧА:
1. Определи 2-4 ключевых сегмента целевой аудитории для этого конкретного ${typeText}
2. Для КАЖДОГО сегмента определи:
   - Название сегмента (коротко, 2-4 слова)
   - Детальное описание (кто это, возраст, интересы, мотивация посетить этот ${typeText})
   - 3-5 основных болей/проблем, которые решает этот ${typeText}
   - 3-5 потребностей/желаний
   - Демографические данные (возраст, пол, локация, доход)

3. Общая информация о ${typeText}:
   - Краткое описание (1-2 предложения) - о чем этот ${typeText}
   - Ключевые особенности (3-5 пунктов) - что уникального предлагается
   - Тон голоса (professional/casual/friendly/luxury и т.д.)

ФОРМАТ ОТВЕТА (JSON):
{
  "summary": "Краткое описание ${typeText}",
  "key_features": ["Особенность 1", "Особенность 2", "Особенность 3"],
  "brand_voice": "professional",
  "target_audiences": [
    {
      "name": "Название сегмента",
      "description": "Детальное описание аудитории",
      "pain_points": ["Боль 1", "Боль 2", "Боль 3"],
      "needs": ["Потребность 1", "Потребность 2", "Потребность 3"],
      "demographics": {
        "age": "25-40",
        "gender": "all/male/female",
        "location": "Россия, крупные города",
        "income": "средний/выше среднего"
      }
    }
  ]
}

Отвечай ТОЛЬКО валидным JSON без дополнительного текста.`,

        en: `
Analyze the web page (webinar/landing/campaign) and identify target audiences for advertising creatives.

CONTEXT: This is a sub-project of type "${subproject.type}" - ${subproject.name}

PAGE CONTENT:
${websiteContent}

TASK:
1. Identify 2-4 key target audience segments for this specific ${typeText}
2. For EACH segment define:
   - Segment name (brief, 2-4 words)
   - Detailed description (who they are, age, interests, motivation to visit this ${typeText})
   - 3-5 main pain points/problems this ${typeText} solves
   - 3-5 needs/desires
   - Demographic data (age, gender, location, income)

3. General ${typeText} information:
   - Brief description (1-2 sentences) - what this ${typeText} is about
   - Key features (3-5 points) - what unique value is offered
   - Voice tone (professional/casual/friendly/luxury etc.)

RESPONSE FORMAT (JSON):
{
  "summary": "Brief ${typeText} description",
  "key_features": ["Feature 1", "Feature 2", "Feature 3"],
  "brand_voice": "professional",
  "target_audiences": [
    {
      "name": "Segment name",
      "description": "Detailed audience description",
      "pain_points": ["Pain 1", "Pain 2", "Pain 3"],
      "needs": ["Need 1", "Need 2", "Need 3"],
      "demographics": {
        "age": "25-40",
        "gender": "all/male/female",
        "location": "USA, major cities",
        "income": "middle/above average"
      }
    }
  ]
}

Respond ONLY with valid JSON without additional text.`
    };

    return prompts[language] || prompts['uk'];
};

async function scrapeWebsite(url: string): Promise<string> {
    try {
        // Use simple fetch instead of Puppeteer for Vercel compatibility
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AdsAI/1.0; +https://ads-ai.vercel.app)',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();

        // Simple HTML parsing
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : '';

        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const metaDescription = metaDescMatch ? metaDescMatch[1] : '';

        // Extract headings
        const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
        const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
        const h3Matches = html.match(/<h3[^>]*>([^<]+)<\/h3>/gi) || [];
        
        const headings = [...h1Matches, ...h2Matches, ...h3Matches]
            .map(h => h.replace(/<[^>]+>/g, '').trim())
            .filter(Boolean)
            .slice(0, 10);

        // Extract paragraphs
        const pMatches = html.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
        const paragraphs = pMatches
            .map(p => p.replace(/<[^>]+>/g, '').trim())
            .filter(text => text.length > 20)
            .slice(0, 20);

        return JSON.stringify({
            title,
            metaDescription,
            headings,
            paragraphs,
        });
    } catch (error) {
        console.error('Scraping error:', error);
        throw new Error('Failed to scrape website: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

export async function POST(request: NextRequest) {
    try {
        const { subprojectId } = await request.json();

        if (!subprojectId) {
            return NextResponse.json(
                { error: 'Subproject ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServerSupabase();

        // Get subproject details
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

        if (!subproject.url) {
            return NextResponse.json(
                { error: 'Subproject URL is required for analysis' },
                { status: 400 }
            );
        }

        // Scrape website content
        const websiteContent = await scrapeWebsite(subproject.url);

        // Analyze with Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const analysisPrompt = getSubprojectAnalysisPrompt(websiteContent, subproject, subproject.language || 'uk');

        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse analysis result');
        }

        const analysisData = JSON.parse(jsonMatch[0]);

        // Update subproject with analysis results
        const { error: updateError } = await supabase
            .from('subprojects')
            .update({
                analysis_result: analysisData,
            })
            .eq('id', subprojectId);

        if (updateError) {
            throw updateError;
        }

        // Save each target audience as a separate record
        const audiencesToInsert = analysisData.target_audiences.map((audience: any) => ({
            subproject_id: subprojectId,
            name: audience.name,
            description: audience.description,
            pain_points: audience.pain_points,
            needs: audience.needs,
            demographics: audience.demographics,
        }));

        const { error: audiencesError } = await supabase
            .from('subproject_target_audiences')
            .insert(audiencesToInsert);

        if (audiencesError) {
            console.error('Failed to save target audiences:', audiencesError);
        }

        return NextResponse.json({
            success: true,
            analysis: analysisData,
        });
    } catch (error) {
        console.error('Analysis error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Analysis failed',
                details: error instanceof Error ? error.stack : String(error)
            },
            { status: 500 }
        );
    }
}
