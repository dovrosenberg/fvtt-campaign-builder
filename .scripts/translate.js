const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to find differences between source and target JSON objects
function findDifferences(source, target, currentPath = '') {
  const differences = {};
  
  // Check for new or modified keys in source
  for (const key in source) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    
    // If target doesn't have this key, it's new
    if (!(key in target)) {
      differences[newPath] = source[key];
      continue;
    }
    
    // If values are objects, recursively check for differences
    if (typeof source[key] === 'object' && source[key] !== null && 
        typeof target[key] === 'object' && target[key] !== null) {
      const nestedDiffs = findDifferences(source[key], target[key], newPath);
      Object.assign(differences, nestedDiffs);
    } 
    // If values are different primitives, mark for translation
    else if (JSON.stringify(source[key]) !== JSON.stringify(target[key])) {
      differences[newPath] = source[key];
    }
  }
  
  return differences;
}

// Helper function to find keys that exist in target but not in source (deleted keys)
function findDeletedKeys(source, target, currentPath = '') {
  const deletedKeys = [];
  
  // Check for keys in target that don't exist in source
  for (const key in target) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    
    // If source doesn't have this key, it's been deleted
    if (!(key in source)) {
      deletedKeys.push(newPath);
      continue;
    }
    
    // If values are objects, recursively check for deleted keys
    if (typeof source[key] === 'object' && source[key] !== null && 
        typeof target[key] === 'object' && target[key] !== null) {
      const nestedDeleted = findDeletedKeys(source[key], target[key], newPath);
      deletedKeys.push(...nestedDeleted);
    }
  }
  
  return deletedKeys;
}

// Helper function to set a nested value in an object using a path string
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

async function translateJson(sourceFile, targetLang) {
  try {
    // Read the English source file
    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    
    // Create target file path
    const targetFile = path.join(
      path.dirname(sourceFile),
      `${targetLang}.json`
    );
    
    // Check if target file exists and read it
    let targetData = {};
    let differencesToTranslate = {};
    
    if (fs.existsSync(targetFile)) {
      try {
        targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        console.log(`Found existing translation file: ${targetFile}`);
        
        // Find differences between source and target
        differencesToTranslate = findDifferences(sourceData, targetData);
        
        // Find keys that have been deleted from the source
        const deletedKeys = findDeletedKeys(sourceData, targetData);
        
        if (Object.keys(differencesToTranslate).length === 0 && deletedKeys.length === 0) {
          console.log(`No changes detected for ${targetLang}. Skipping translation.`);
          return targetFile;
        }
        
        if (Object.keys(differencesToTranslate).length > 0) {
          console.log(`Found ${Object.keys(differencesToTranslate).length} new or modified strings to translate.`);
        }
        
        if (deletedKeys.length > 0) {
          console.log(`Found ${deletedKeys.length} keys to remove from the translation file:`);
          deletedKeys.forEach(key => console.log(`  - ${key}`));
        }
      } catch (readError) {
        console.error(`Error reading existing target file: ${readError.message}`);
        console.log('Proceeding with full translation...');
        differencesToTranslate = sourceData;
      }
    } else {
      console.log(`No existing translation file found. Creating new file: ${targetFile}`);
      differencesToTranslate = sourceData;
    }
    
    console.log(`Translating differences from ${sourceFile} to ${targetLang}...`);
    
    // Prepare the prompt for OpenAI
    const prompt = `
      Translate the following JSON content from English to ${getLanguageName(targetLang)}.
      Only translate the values, not the keys.
      Maintain all JSON formatting, including nested objects.
      Preserve any special characters or placeholders like {name}, {{value}}, etc.
      Return only the translated JSON content.
      
      JSON to translate:
      ${JSON.stringify(differencesToTranslate, null, 2)}
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
    let translatedDifferences;
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      if (translatedContent.includes('```json')) {
        const jsonMatch = translatedContent.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          translatedDifferences = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Could not extract JSON from markdown response');
        }
      } else if (translatedContent.includes('```')) {
        const jsonMatch = translatedContent.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          translatedDifferences = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Could not extract JSON from markdown response');
        }
      } else {
        // Try to parse the entire response as JSON
        translatedDifferences = JSON.parse(translatedContent);
      }
    } catch (parseError) {
      console.error('Error parsing translated JSON:', parseError);
      console.log('Raw response:', translatedContent);
      throw new Error('Failed to parse translated content as JSON');
    }
    
    // If we're doing a partial update, merge the translations
    let finalTranslation;
    if (Object.keys(targetData).length > 0) {
      finalTranslation = JSON.parse(JSON.stringify(targetData)); // Deep clone
      
      // Merge the translated differences into the existing translation
      if (Object.keys(differencesToTranslate).length !== Object.keys(sourceData).length) {
        // For partial translations, we need to update the nested paths
        for (const path in translatedDifferences) {
          setNestedValue(finalTranslation, path, translatedDifferences[path]);
        }
      } else {
        // For full translations, we can just use the translated result
        finalTranslation = translatedDifferences;
      }
    } else {
      // For new translations, use the full translated content
      finalTranslation = translatedDifferences;
    }
    
    // Ensure the structure matches the source data (add missing keys and remove deleted keys)
    const syncStructure = (source, target) => {
      // First, add missing keys from source to target
      for (const key in source) {
        if (!(key in target)) {
          target[key] = source[key];
        } else if (
          typeof source[key] === 'object' && source[key] !== null &&
          typeof target[key] === 'object' && target[key] !== null
        ) {
          syncStructure(source[key], target[key]);
        }
      }
      
      // Then, remove keys from target that don't exist in source
      for (const key in target) {
        if (!(key in source)) {
          delete target[key];
        } else if (
          typeof source[key] === 'object' && source[key] !== null &&
          typeof target[key] === 'object' && target[key] !== null
        ) {
          // We've already recursively added missing keys, so we just need to handle deletions
          // for nested objects that exist in both source and target
        }
      }
    };
    
    syncStructure(sourceData, finalTranslation);
    
    // Write the translated JSON to the target file
    fs.writeFileSync(targetFile, JSON.stringify(finalTranslation, null, 2));
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
  // Check if specific source file and language are provided as command-line arguments
  const args = process.argv.slice(2);
  let sourceFile = 'static/lang/en.json';
  let languagesToProcess = TARGET_LANGUAGES;
  
  if (args.length >= 1) {
    sourceFile = args[0];
    console.log(`Using custom source file: ${sourceFile}`);
  }
  
  if (args.length >= 2) {
    languagesToProcess = [args[1]];
    console.log(`Processing only language: ${args[1]}`);
  } else {
    console.log(`Starting translation for languages: ${TARGET_LANGUAGES.join(', ')}`);
  }
  
  // Process each language
  for (const lang of languagesToProcess) {
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