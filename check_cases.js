const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
        filesList.push(filePath);
      }
    }
  }
  return filesList;
}

const allFiles = getFiles(path.join(__dirname, 'app'));
allFiles.push(...getFiles(path.join(__dirname, 'components')));
allFiles.push(...getFiles(path.join(__dirname, 'lib')));
allFiles.push(...getFiles(path.join(__dirname, 'store')));
allFiles.push(...getFiles(path.join(__dirname, 'constants')));

const truePaths = new Set();
function collectTruePaths(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                collectTruePaths(filePath);
            }
        } else {
            truePaths.add(filePath.replace(/\\/g, '/'));
        }
    }
}
collectTruePaths(__dirname);

let foundError = false;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip external modules
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
    
    let resolvedPath = '';
    if (importPath.startsWith('@/')) {
        resolvedPath = path.join(__dirname, importPath.replace('@/', ''));
    } else {
        resolvedPath = path.join(path.dirname(file), importPath);
    }
    
    const possiblePaths = [
        resolvedPath + '.ts',
        resolvedPath + '.tsx',
        resolvedPath + '.js',
        resolvedPath + '/index.ts',
        resolvedPath + '/index.tsx',
        resolvedPath + '/index.js'
    ];
    
    let matchedCase = false;
    let matchedWrongCase = false;
    let wrongCaseName = '';
    
    for (const p of truePaths) {
        const pLower = p.toLowerCase();
        for (const pp of possiblePaths) {
            const ppNorm = pp.replace(/\\/g, '/');
            if (pLower === ppNorm.toLowerCase()) {
                if (p === ppNorm) {
                    matchedCase = true;
                } else {
                    matchedWrongCase = true;
                    wrongCaseName = p;
                }
            }
        }
    }
    
    if (matchedWrongCase && !matchedCase) {
        console.log(`CASE MISMATCH in ${file}:\nImported: '${importPath}'\nReal file: '${wrongCaseName}'\n`);
        foundError = true;
    }
  }
}

if (!foundError) console.log("No relative or absolute case mismatches found!");
