import { GoogleGenerativeAI } from '@google/generative-ai';
import { TargetAudience } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AnalysisResult {
    summary: string;
    key_features: string[];
    brand_voice: string;
    target_audiences: TargetAudience[];
}

export async function analyzeWebsite(url: string, screenshotBase64?: string, websiteContext?: string): Promise<AnalysisResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Проведи глибокий візуальний та змістовий аналіз веб-сайту за URL: ${url}
    
    Я надаю тобі скріншот повної сторінки та її детальний контекст.
    
    Твоє завдання - провести всебічний аналіз:
    
    1. **Візуальний аналіз скріншоту**:
       - Опиши загальний стиль, кольорову гаму та атмосферу
       - Що зображено на головному банері? Які емоції це викликає?
       - Як структурована інформація? (Секції, блоки)
       - Які візуальні акценти використовуються для закликів до дії (CTA)?
       - Що написано на зображеннях та банерах?
       - Загальне враження від сайту
    
    2. **Змістовий аналіз**:
       - Про що цей сайт? Яка головна ціннісна пропозиція?
       - Які ключові переваги виділено?
       - Який тон комунікації (Brand Voice)?
       - Проаналізуй заголовки, кнопки та CTA
    
    3. **Аналіз Аудиторії**:
       - На основі візуалу та тексту, хто є ідеальним клієнтом?
       - Які їхні болі та потреби вирішує цей продукт/послуга?

    На основі цього глибокого аналізу, сформуй відповідь у форматі JSON:
    1. summary - детальний опис бізнесу/продукту, враховуючи візуальні інсайти
    2. key_features - масив ключових особливостей (мінімум 5)
    3. brand_voice - опис тону бренду
    4. target_audiences - масив з 3-5 детальних сегментів цільової аудиторії, кожен об'єкт повинен мати:
       - id: унікальний ідентифікатор (рядок, наприклад "segment_1")
       - name: назва сегменту
       - description: детальний опис
       - pain_points: масив болей (мінімум 3 рядки)
       - needs: масив потреб (мінімум 3 рядки)
       - demographics: демографічні характеристики (рядок)

    Відповідь має бути ТІЛЬКИ валідним JSON без додаткового тексту.`;

    const parts: any[] = [
        { text: prompt }
    ];

    // Add screenshot for visual analysis
    if (screenshotBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: screenshotBase64,
            },
        });
    }

    // Add website context
    if (websiteContext) {
        parts.push({
            text: `\n\nКОНТЕКСТ САЙТУ:\n${websiteContext}`
        });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini response received, length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('Failed to extract JSON from response');
        console.error('Full response:', text);
        throw new Error('Failed to parse analysis result');
    }

    console.log('JSON extracted successfully');
    return JSON.parse(jsonMatch[0]);
}

export async function analyzeScreenshot(imageBase64: string): Promise<AnalysisResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Проаналізуй скріншот веб-сайту або рекламного матеріалу.

Надай детальний аналіз у форматі JSON з наступними полями:
1. summary - короткий опис бізнесу/продукту
2. key_features - масив ключових особливостей продукту/послуги
3. brand_voice - опис тону бренду (формальний, дружній, професійний тощо)
4. target_audiences - масив з 3-5 сегментів цільової аудиторії, кожен з полями:
   - id: унікальний ідентифікатор
   - name: назва сегменту
   - description: опис сегменту
   - pain_points: масив болей аудиторії
   - needs: масив потреб аудиторії
   - demographics: демографічні характеристики

Відповідь має бути ТІЛЬКИ валідним JSON без додаткового тексту.`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
            },
        },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse analysis result');
    }

    return JSON.parse(jsonMatch[0]);
}

export async function analyzeDescription(description: string): Promise<AnalysisResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Проаналізуй опис бізнесу/продукту: "${description}"

Надай детальний аналіз у форматі JSON з наступними полями:
1. summary - короткий опис бізнесу/продукту
2. key_features - масив ключових особливостей продукту/послуги
3. brand_voice - опис тону бренду (формальний, дружній, професійний тощо)
4. target_audiences - масив з 3-5 сегментів цільової аудиторії, кожен з полями:
   - id: унікальний ідентифікатор
   - name: назва сегменту
   - description: опис сегменту
   - pain_points: масив болей аудиторії
   - needs: масив потреб аудиторії
   - demographics: демографічні характеристики

Відповідь має бути ТІЛЬКИ валідним JSON без додаткового тексту.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse analysis result');
    }

    return JSON.parse(jsonMatch[0]);
}

export async function chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-flash-latest',
        systemInstruction: {
            role: 'system',
            parts: [{
                text: `Ти - асистент для створення рекламних креативів. Твої відповіді мають бути:

1. Чистим текстом без markdown форматування (БЕЗ **, ##, ###, _, тощо)
2. Структурованими та легко читаними
3. З використанням простих розділових знаків (-, •, цифри) для списків
4. З порожніми рядками для розділення секцій
5. З emoji лише там де це доречно (✓, ✗, ☑)

Приклад правильного форматування:

Питання користувача:
Як згенерувати банер?

Правильна відповідь:
Для генерації банера потрібно:

1. Обрати проект зі списку
2. Вибрати цільову аудиторію
3. Встановити розмір креативу
4. Натиснути кнопку "Генерувати"

Додаткові можливості:
- Завантаження логотипу
- Додавання фото людини або товару
- Вибір шаблону фону

НЕПРАВИЛЬНО (не використовуй таке форматування):
**Для генерації** банера потрібно:
### Крок 1: **Обрати** проект
**Вибрати** аудиторію

ОСОБЛИВА ІНСТРУКЦІЯ ПРО ПОСИЛАННЯ:
Якщо користувач надсилає URL/посилання на веб-сайт, ти ЗАВЖДИ маєш:
1. Визначити що це посилання
2. Відповісти ТІЛЬКИ: "Бачу, що ви надіслали посилання на сайт [URL]. Хочете створити новий проект та провести аналіз цього сайту?"
3. НЕ додавати жодних інструкцій чи кроків
4. НЕ використовувати ###, **, чи інше форматування

Завжди пиши чистим текстом без зайвого форматування!`
            }]
        }
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
    }));

    const chatSession = model.startChat({
        history,
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chatSession.sendMessage(lastMessage.content);
    const response = await result.response;

    return response.text();
}
