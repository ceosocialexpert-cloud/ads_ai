import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSupabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
        const { projectId } = await request.json();

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
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

        if (!project.url) {
            return NextResponse.json(
                { error: 'Project URL is required for analysis' },
                { status: 400 }
            );
        }

        // Scrape website content
        const websiteContent = await scrapeWebsite(project.url);

        // Analyze with Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const analysisPrompt = `
Проаналізуй веб-сайт та визнач цільові аудиторії для рекламних креативів.

КОНТЕНТ САЙТУ:
${websiteContent}

ЗАВДАННЯ:
1. Визнач 3-5 ключових сегментів цільової аудиторії
2. Для КОЖНОГО сегменту визнач:
   - Назву сегменту (коротко, 2-4 слова)
   - Детальний опис (хто це, вік, інтереси, рівень доходу)
   - 3-5 основних болей/проблем
   - 3-5 потреб/бажань
   - Демографічні дані (вік, стать, локація, дохід)

3. Загальна інформація про продукт:
   - Короткий опис (1-2 речення)
   - Ключові особливості (3-5 пунктів)
   - Тон голосу бренду (professional/casual/friendly/luxury тощо)

ФОРМАТ ВІДПОВІДІ (JSON):
{
  "summary": "Короткий опис продукту/послуги",
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

Відповідай ТІЛЬКИ валідним JSON без додаткового тексту.`;

        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse analysis result');
        }

        const analysisData = JSON.parse(jsonMatch[0]);

        // Update project with analysis results
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                analysis_result: analysisData,
            })
            .eq('id', projectId);

        if (updateError) {
            throw updateError;
        }

        // Save each target audience as a separate record
        const audiencesToInsert = analysisData.target_audiences.map((audience: any) => ({
            project_id: projectId,
            name: audience.name,
            description: audience.description,
            pain_points: audience.pain_points,
            needs: audience.needs,
            demographics: audience.demographics,
        }));

        const { error: audiencesError } = await supabase
            .from('target_audiences')
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
