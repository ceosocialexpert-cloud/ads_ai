const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const apiKey = envConfig['GEMINI_API_KEY'];

console.log("API Key found:", !!apiKey);

async function testImageGen() {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

    const prompt = "A futuristic city with flying cars, neon lights, cyberpunk style";

    console.log("Generating image with prompt:", prompt);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;

        console.log("Response received");
        // console.log(JSON.stringify(response, null, 2));

        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts) {
                console.log("Parts found:", candidate.content.parts.length);
                candidate.content.parts.forEach((part, i) => {
                    if (part.inlineData) {
                        console.log(`Part ${i}: Inline Data (Mime: ${part.inlineData.mimeType}, Length: ${part.inlineData.data.length})`);
                    } else if (part.text) {
                        console.log(`Part ${i}: Text: ${part.text}`);
                    } else {
                        console.log(`Part ${i}: Unknown type`, part);
                    }
                });
            }
        } else {
            console.log("No candidates found");
        }

    } catch (e) {
        console.error("Generation Failed:", e);
    }
}

testImageGen();
