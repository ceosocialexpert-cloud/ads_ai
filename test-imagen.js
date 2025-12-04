// Quick test script for Imagen API
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

const PROJECT_ID = 'gen-lang-client-0613592862';
const LOCATION = 'global';
const CREDENTIALS_PATH = './service-account-key.json';

async function testImagen() {
    console.log('🧪 Testing Gemini 3 Pro Image Preview API...\n');
    
    try {
        // Get access token
        console.log('🔐 Getting access token...');
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }
        console.log('✅ Got access token\n');
        
        // Prepare request
        const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-3-pro-image-preview:generateContent`;
        
        const requestBody = {
            contents: {
                role: 'user',
                parts: [{ text: 'Generate a simple test image of a modern office workspace' }]
            },
            generation_config: {
                response_modalities: ['IMAGE'],
                image_config: {
                    aspect_ratio: '1:1',
                    image_size: '1K'
                }
            }
        };
        
        console.log('📤 Sending request to Gemini API...');
        console.log('Endpoint:', endpoint);
        console.log('Prompt:', requestBody.contents.parts[0].text, '\n');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Got response from API\n');
        
        // Log response structure
        console.log('📋 Response structure:');
        console.log('  - Has candidates:', !!data.candidates);
        console.log('  - Candidates count:', data.candidates?.length || 0);
        
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            console.log('  - First candidate has content:', !!candidate.content);
            console.log('  - First candidate has parts:', !!candidate.content?.parts);
            console.log('  - Parts count:', candidate.content?.parts?.length || 0);
            
            if (candidate.content?.parts && candidate.content.parts.length > 0) {
                const part = candidate.content.parts[0];
                console.log('\n  📦 First part structure:');
                console.log('    - Keys:', Object.keys(part));
                console.log('    - Has "image" field:', !!part.image);
                console.log('    - Has "inline_data" field:', !!part.inline_data);
                
                if (part.image) {
                    console.log('    - image keys:', Object.keys(part.image));
                    if (part.image.imageBytes) {
                        console.log('    - ✅ Found imageBytes! Length:', part.image.imageBytes.length);
                    }
                }
                
                if (part.inlineData) {
                    console.log('    - inlineData keys:', Object.keys(part.inlineData));
                    if (part.inlineData.data) {
                        console.log('    - ✅ Found inlineData.data! Length:', part.inlineData.data.length);
                    }
                }
                
                if (part.inline_data) {
                    console.log('    - inline_data keys:', Object.keys(part.inline_data));
                    if (part.inline_data.data) {
                        console.log('    - ✅ Found inline_data.data! Length:', part.inline_data.data.length);
                    }
                }
            }
        }
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

testImagen();
