import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite, analyzeScreenshot, analyzeDescription } from '@/lib/gemini';
import { getServerSupabase } from '@/lib/supabase';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, data, sessionId } = body;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        let analysisResult;

        switch (type) {
            case 'url':
                if (!data.url) {
                    return NextResponse.json(
                        { error: 'URL is required' },
                        { status: 400 }
                    );
                }

                // Launch Puppeteer to scrape the website
                let browser;
                let screenshotBase64;
                let websiteContent;

                try {
                    browser = await puppeteer.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    });
                    const page = await browser.newPage();

                    // Set viewport for desktop view
                    await page.setViewport({ width: 1920, height: 1080 });

                    // Navigate to URL
                    await page.goto(data.url, { waitUntil: 'networkidle2', timeout: 30000 });

                    // Capture full page screenshot
                    const screenshotBuffer = await page.screenshot({
                        encoding: 'base64',
                        fullPage: true
                    });
                    screenshotBase64 = screenshotBuffer as string;

                    // Extract comprehensive website content
                    websiteContent = await page.evaluate(() => {
                        const allText = document.body.innerText;
                        
                        // Extract meta tags
                        const metaTags: any = {};
                        document.querySelectorAll('meta').forEach(meta => {
                            const name = meta.getAttribute('name') || meta.getAttribute('property');
                            const content = meta.getAttribute('content');
                            if (name && content) metaTags[name] = content;
                        });

                        // Extract headings
                        const headings: any[] = [];
                        ['h1', 'h2', 'h3'].forEach(tag => {
                            document.querySelectorAll(tag).forEach(el => {
                                if (el.textContent?.trim()) {
                                    headings.push({ tag, text: el.textContent.trim() });
                                }
                            });
                        });

                        // Extract buttons and CTAs
                        const buttons: any[] = [];
                        document.querySelectorAll('button, a.btn, a[class*="button"]').forEach(el => {
                            const text = el.textContent?.trim();
                            const href = (el as HTMLAnchorElement).href;
                            if (text) buttons.push({ text, href: href || '' });
                        });

                        // Extract images with alt text
                        const images: any[] = [];
                        document.querySelectorAll('img').forEach(img => {
                            const src = (img as HTMLImageElement).src;
                            const alt = (img as HTMLImageElement).alt;
                            if (src) images.push({ src, alt: alt || '' });
                        });

                        return {
                            url: window.location.href,
                            title: document.title,
                            metaTags,
                            headings,
                            buttons,
                            images: images.slice(0, 10), // Limit to first 10 images
                            allText: allText.substring(0, 10000) // First 10k chars
                        };
                    });

                } catch (scrapeError) {
                    console.error('Scraping error:', scrapeError);
                    return NextResponse.json(
                        { error: 'Failed to access website. Please check the URL.' },
                        { status: 400 }
                    );
                } finally {
                    if (browser) {
                        await browser.close();
                    }
                }

                console.log('Website content extracted successfully');
                console.log('Screenshot size:', screenshotBase64?.length || 0);
                console.log('Title:', websiteContent?.title);
                console.log('Headings count:', websiteContent?.headings?.length || 0);

                // Analyze with visual and text context
                const websiteContext = `
WEBSITE URL: ${websiteContent.url}

TITLE: ${websiteContent.title}

META TAGS:
${JSON.stringify(websiteContent.metaTags, null, 2)}

HEADINGS:
${websiteContent.headings.map((h: any) => `${h.tag}: ${h.text}`).join('\n')}

BUTTONS AND CTAS:
${websiteContent.buttons.map((b: any) => `"${b.text}" → ${b.href}`).join('\n')}

IMAGES (alt text):
${websiteContent.images.map((img: any) => `${img.alt || 'no description'} (${img.src})`).join('\n')}

FULL TEXT (first 10000 chars):
${websiteContent.allText}
`;

                console.log('Calling Gemini API for analysis...');
                analysisResult = await analyzeWebsite(data.url, screenshotBase64, websiteContext);
                console.log('Analysis completed:', JSON.stringify(analysisResult, null, 2));
                break;

            case 'screenshot':
                if (!data.imageBase64) {
                    return NextResponse.json(
                        { error: 'Image data is required' },
                        { status: 400 }
                    );
                }
                analysisResult = await analyzeScreenshot(data.imageBase64);
                break;

            case 'description':
                if (!data.description) {
                    return NextResponse.json(
                        { error: 'Description is required' },
                        { status: 400 }
                    );
                }
                analysisResult = await analyzeDescription(data.description);
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid analysis type' },
                    { status: 400 }
                );
        }

        // Save to database
        const supabase = getServerSupabase();

        const { data: project, error } = await supabase
            .from('projects')
            .insert({
                session_id: sessionId,
                url: type === 'url' ? data.url : null,
                description: type === 'description' ? data.description : null,
                screenshot_url: type === 'screenshot' ? data.screenshotUrl : null,
                analysis_result: {
                    summary: analysisResult.summary,
                    key_features: analysisResult.key_features,
                    brand_voice: analysisResult.brand_voice,
                },
                target_audiences: analysisResult.target_audiences,
            })
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to save analysis' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            project,
            analysis: analysisResult,
        });
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}
