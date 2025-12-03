import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSupabase } from '@/lib/supabase';
import puppeteer from 'puppeteer';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function scrapeWebsite(url: string): Promise<string> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        const content = await page.evaluate(() => {
            const title = document.title;
            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent?.trim()).filter(Boolean);
            const paragraphs = Array.from(document.querySelectorAll('p')).map(el => el.textContent?.trim()).filter(Boolean);

            return {
                title,
                metaDescription,
                headings: headings.slice(0, 10),
                paragraphs: paragraphs.slice(0, 20),
            };
        });

        return JSON.stringify(content);
    } finally {
        await browser.close();
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}
