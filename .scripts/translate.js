const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function translateJson(sourceFile, targetLang) {
  try {
    // Read the English source file
    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    
    // Create target file path
    const targetFile = path.join(
      path.dirname(sourceFile),
      `${targetLang}.json`
    );
    
    console.log(`Translating ${sourceFile} to ${targetLang}...`);
    
    // Prepare the prompt for OpenAI
    const prompt = `
      Translate the following JSON content from English to ${getLanguageName(targetLang)}.
      Only translate the values, not the keys.
      Maintain all JSON formatting, including nested objects.
      Preserve any special characters or placeholders like {name}, {{value}}, etc.
      Return only the translated JSON content.
      
      JSON to translate:
      ${JSON.stringify(sourceData, null, 2)}
    `;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional translator specializing in software localization."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    });
    
    // Extract the translated JSON from the response
    const translatedContent = response.choices[0].message.content.trim();
    
    // Parse the response to ensure it's valid JSON
    let translatedJson;
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      if (translatedContent.includes('```json')) {
        const jsonMatch = translatedContent.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          translatedJson = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Could not extract JSON from markdown response');
        }
      } else if (translatedContent.includes('```')) {
        const jsonMatch = translatedContent.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          translatedJson = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Could not extract JSON from markdown response');
        }
      } else {
        // Try to parse the entire response as JSON
        translatedJson = JSON.parse(translatedContent);
      }
    } catch (parseError) {
      console.error('Error parsing translated JSON:', parseError);
      console.log('Raw response:', translatedContent);
      throw new Error('Failed to parse translated content as JSON');
    }
    
    // Write the translated JSON to the target file
    fs.writeFileSync(targetFile, JSON.stringify(translatedJson, null, 2));
    console.log(`Translation complete: ${targetFile}`);
    
    return targetFile;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

function getLanguageName(langCode) {
  const languages = {
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese'
  };
  
  return languages[langCode] || langCode;
}

// Define target languages to translate to
const TARGET_LANGUAGES = ['fr', 'de']; // Currently French and German as mentioned in CHANGELOG
// Add more languages here as needed: 'es', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'

// Main execution
async function main() {
  const sourceFile = 'static/lang/en.json';
  
  console.log(`Starting translation for languages: ${TARGET_LANGUAGES.join(', ')}`);
  
  // Process each language
  for (const lang of TARGET_LANGUAGES) {
    try {
      console.log(`\n=== Processing ${getLanguageName(lang)} (${lang}) ===`);
      await translateJson(sourceFile, lang);
    } catch (error) {
      console.error(`Failed to translate to ${lang}:`, error);
      // Continue with other languages even if one fails
    }
  }
}

main();