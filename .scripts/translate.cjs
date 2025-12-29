const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { execSync } = require('child_process');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get the previous version of a file from Git
function getPreviousVersionFromGit(filePath) {
  try {
    // Get the previous version of the file from Git
    // This command gets the content of the file from the previous commit
    const previousContent = execSync(`git show HEAD~1:"${filePath}"`, { encoding: 'utf8' });
    
    try {
      // Parse the previous content as JSON
      return JSON.parse(previousContent);
    } catch (parseError) {
      console.error('Error parsing previous version from Git:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error getting previous version from Git:', error);
    console.log('This might be the first commit for this file or Git is not available.');
    return null;
  }
}

// Helper function to find differences between source and target JSON objects
// previousSource is the previous version of the source file (from Git)
function findDifferences(source, target, previousSource = null, currentPath = '') {
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
      // Get the previous source value for this path if available
      const prevSourceForPath = previousSource && typeof previousSource === 'object' ? 
                               previousSource[key] : null;
      
      const nestedDiffs = findDifferences(source[key], target[key], prevSourceForPath, newPath);
      Object.assign(differences, nestedDiffs);
    } 
    // For primitive values, check if the English source has actually changed
    else if (typeof source[key] === 'string' && typeof target[key] === 'string') {
      // If we have a previous version of the source, check if the value has changed
      if (previousSource && typeof previousSource === 'object' && key in previousSource) {
        // If the current source is different from the previous source, it needs translation
        if (source[key] !== previousSource[key]) {
          console.log(`Detected change in English text for "${newPath}":`);
          console.log(`  Old: ${previousSource[key]}`);
          console.log(`  New: ${source[key]}`);
          differences[newPath] = source[key];
        }
      } 
      // If we don't have a previous version or the key doesn't exist in previous version,
      // we'll only mark it for translation if it's a new key (handled above)
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

// Helper function to sync structure between source and target
function syncStructure(source, target) {
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
      syncStructure(source[key], target[key]);
    }
  }
}

function getLanguageName(langCode) {
  const languages = {
    fr: 'French',
    de: 'German',
    ru: 'Russian',
  };
  
  return languages[langCode] || langCode;
}

// Define target languages to translate to - also need to add to getLanguageName above and to module.json
const TARGET_LANGUAGES = ['fr', 'de', 'ru']; 

// Function to translate to multiple languages at once
async function translateToMultipleLanguages(sourceFile, languages) {
  try {
    // Read the English source file
    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    
    // Get the previous version of the source file from Git
    const previousSourceData = getPreviousVersionFromGit(sourceFile);
    if (previousSourceData) {
      console.log('Found previous version of source file from Git');
    } else {
      console.log('No previous version found or Git is not available. Will perform full comparison.');
    }
    
    // Collect differences for each language
    const allDifferences = {};
    const allTargetData = {};
    const allDeletedKeys = {};
    let hasChanges = false;
    
    // First pass: collect all differences and existing translations
    for (const lang of languages) {
      const targetFile = path.join(path.dirname(sourceFile), `${lang}.json`);
      
      if (fs.existsSync(targetFile)) {
        try {
          const targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
          console.log(`Found existing translation file: ${targetFile}`);
          
          // Find differences between source and target, using the previous source for comparison
          const differences = findDifferences(sourceData, targetData, previousSourceData);
          
          // Find keys that have been deleted from the source
          const deletedKeys = findDeletedKeys(sourceData, targetData);
          
          if (Object.keys(differences).length > 0 || deletedKeys.length > 0) {
            hasChanges = true;
            allDifferences[lang] = differences;
            allTargetData[lang] = targetData;
            allDeletedKeys[lang] = deletedKeys;
            
            if (Object.keys(differences).length > 0) {
              console.log(`Found ${Object.keys(differences).length} new or modified strings to translate for ${lang}.`);
            }
            
            if (deletedKeys.length > 0) {
              console.log(`Found ${deletedKeys.length} keys to remove from ${lang} translation file.`);
            }
          } else {
            console.log(`No changes detected for ${lang}. Skipping translation.`);
            // Still store the target data for later reference
            allTargetData[lang] = targetData;
          }
        } catch (readError) {
          console.error(`Error reading existing target file for ${lang}: ${readError.message}`);
          console.log(`Proceeding with full translation for ${lang}...`);
          allDifferences[lang] = sourceData;
          allTargetData[lang] = {};
          allDeletedKeys[lang] = [];
          hasChanges = true;
        }
      } else {
        console.log(`No existing translation file found for ${lang}. Creating new file.`);
        allDifferences[lang] = sourceData;
        allTargetData[lang] = {};
        allDeletedKeys[lang] = [];
        hasChanges = true;
      }
    }
    
    // If no changes for any language, we're done
    if (!hasChanges) {
      console.log('No changes detected for any language. Skipping translation.');
      return;
    }

    // Process each language and update the translation files
    for (const lang of languages) {
      const differences = allDifferences[lang];

      // Skip languages that had no changes
      if (!differences || Object.keys(differences).length === 0) {
        console.log(`No new or modified strings to translate for ${lang}.`);
      } else {
        console.log(`Translating ${Object.keys(differences).length} strings for ${lang}...`);

        const languageName = getLanguageName(lang);
        const prompt = `
          Translate the following JSON content from English to ${languageName}.
          Return a JSON object with the translated strings, each with the same paths as the source.
          Only translate the values, not the keys or paths.
          Maintain all JSON formatting, including nested objects.
          Preserve any special characters or placeholders like {name}, {{value}}, etc.

          For example, if the language were French and the input is:
          {
            "greeting": "Hello",
            "farewell": "Goodbye"
          }

          The output should be:
          {
            "greeting": "Bonjour",
            "farewell": "Au revoir"
          }

          JSON to translate:
          ${JSON.stringify(differences, null, 2)}
        `;

        // Call OpenAI API for each language
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
          // Try to extract JSON from markdown response
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
          console.error(`Error parsing translated JSON for ${lang}:`, parseError);
          console.log('Raw response:', translatedContent);
          continue; // Skip this language
        }

        if (!translatedDifferences) {
          console.error(`No translations returned for ${lang}. Skipping.`);
          continue;
        }
        
        // For partial translations, we need to update the nested paths
        for (const path in translatedDifferences) {
          setNestedValue(allTargetData[lang], path, translatedDifferences[path]);
        }
      }

      // For all languages (even those without new translations), sync structure
      const targetFile = path.join(path.dirname(sourceFile), `${lang}.json`);
      let finalTranslation = JSON.parse(JSON.stringify(allTargetData[lang] || {})); // Deep clone

      // Ensure the structure matches the source data (add missing keys and remove deleted keys)
      syncStructure(sourceData, finalTranslation);

      // Write the translated JSON to the target file
      fs.writeFileSync(targetFile, JSON.stringify(finalTranslation, null, 2));
      console.log(`File updated: ${targetFile}`);
    }
    
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

// Function to clean translation files by syncing structure with English source
// This adds missing keys and removes unused ones without translating
function cleanTranslations(sourceFile, languages) {
  try {
    // Read the English source file
    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    console.log(`Cleaning translations for languages: ${languages.join(', ')}`);
    
    let hasChanges = false;
    
    // Process each language
    for (const lang of languages) {
      const targetFile = path.join(path.dirname(sourceFile), `${lang}.json`);
      
      if (fs.existsSync(targetFile)) {
        try {
          const targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
          console.log(`Cleaning existing translation file: ${targetFile}`);
          
          // Create a deep clone of the target data to compare against
          const originalTargetData = JSON.parse(JSON.stringify(targetData));
          
          // Sync structure with source (add missing keys, remove unused ones)
          syncStructure(sourceData, targetData);
          
          // Check if there were any changes
          if (JSON.stringify(originalTargetData) !== JSON.stringify(targetData)) {
            hasChanges = true;
            
            // Write the cleaned translation file
            fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2));
            console.log(`File cleaned and updated: ${targetFile}`);
            
            // Count added and removed keys
            const addedKeys = findDifferences(sourceData, originalTargetData);
            const removedKeys = findDeletedKeys(sourceData, originalTargetData);
            
            if (Object.keys(addedKeys).length > 0) {
              console.log(`  Added ${Object.keys(addedKeys).length} missing keys`);
            }
            
            if (removedKeys.length > 0) {
              console.log(`  Removed ${removedKeys.length} unused keys`);
            }
          } else {
            console.log(`No changes needed for ${lang}. File structure already matches English.`);
          }
        } catch (readError) {
          console.error(`Error reading existing target file for ${lang}: ${readError.message}`);
          console.log(`Creating new translation file for ${lang}...`);
          
          // Create a new file with just the structure (no translations)
          const newTargetData = JSON.parse(JSON.stringify(sourceData));
          fs.writeFileSync(targetFile, JSON.stringify(newTargetData, null, 2));
          console.log(`New translation file created: ${targetFile}`);
          hasChanges = true;
        }
      } else {
        console.log(`No existing translation file found for ${lang}. Creating new file...`);
        
        // Create a new file with just the structure (no translations)
        const newTargetData = JSON.parse(JSON.stringify(sourceData));
        fs.writeFileSync(targetFile, JSON.stringify(newTargetData, null, 2));
        console.log(`New translation file created: ${targetFile}`);
        hasChanges = true;
      }
    }
    
    if (!hasChanges) {
      console.log('No changes needed for any language files.');
    }
    
    return hasChanges;
  } catch (error) {
    console.error('Translation cleaning error:', error);
    throw error;
  }
}

// Main execution
async function main() {
  // Check if specific source file and language are provided as command-line arguments
  const args = process.argv.slice(2);
  let sourceFile = 'static/lang/en.json';
  let languagesToProcess = TARGET_LANGUAGES;
  let operation = 'translate'; // Default operation
  
  // Check for operation flag
  if (args.includes('--clean')) {
    operation = 'clean';
    // Remove --clean from args
    const cleanIndex = args.indexOf('--clean');
    args.splice(cleanIndex, 1);
  }
  
  if (args.length >= 1) {
    sourceFile = args[0];
    console.log(`Using custom source file: ${sourceFile}`);
  }
  
  if (args.length >= 2) {
    languagesToProcess = [args[1]];
    console.log(`Processing only language: ${args[1]}`);
  } else {
    console.log(`Starting ${operation} for languages: ${TARGET_LANGUAGES.join(', ')}`);
  }
  
  // Process based on operation
  try {
    if (operation === 'clean') {
      cleanTranslations(sourceFile, languagesToProcess);
    } else {
      await translateToMultipleLanguages(sourceFile, languagesToProcess);
    }
  } catch (error) {
    console.error(`Failed to ${operation}:`, error);
  }
}

main();