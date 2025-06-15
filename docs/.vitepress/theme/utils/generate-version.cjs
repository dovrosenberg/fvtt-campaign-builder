const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Create version.ts file
const versionContent = `// This file is auto-generated. Do not edit directly.
export const VERSION = '${packageJson.version}';
`;

fs.writeFileSync(path.join(__dirname, 'version.ts'), versionContent); 