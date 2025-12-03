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

async function testImageGeneration() {
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("\n=== Testing gemini-3-pro-image-preview ===");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });
        const prompt = "A simple red circle on white background";

        console.log("Sending prompt:", prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;

        console.log("Response received");
        console.log("Candidates:", response.candidates?.length || 0);

        if (response.candidates && response.candidates[0]) {
            const parts = response.candidates[0].content?.parts;
            console.log("Parts:", parts?.length || 0);

            if (parts) {
                parts.forEach((part, i) => {
                    if (part.inlineData) {
                        console.log(`Part ${i}: Image (${part.inlineData.mimeType})`);
                    } else if (part.text) {
                        console.log(`Part ${i}: Text - ${part.text.substring(0, 100)}`);
                    }
                });
            }
        }

        console.log("✅ Model works!");
    } catch (e) {
        console.error("❌ Model failed:", e.message);
    }
}

testImageGeneration();
