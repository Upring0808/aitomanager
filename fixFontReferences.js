/**
 * This utility can be used to find and fix all font references in your app
 * Run this script manually to see which files need to be updated
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Directories to search
const dirsToSearch = ["./components", "./screens", "./assets", "./styles"];

// Font families to search for
const fontFamilies = [
  "Poppins-Regular",
  "Satisfy-Regular",
  "Lato-Regular",
  "Lato-Bold",
];

// Pattern to match font references in style sheets
const fontPattern = new RegExp(
  `fontFamily:\\s*["']?(${fontFamilies.join("|")})["']?`,
  "g"
);

// Pattern to match font imports
const fontImportPattern = /require\(["']\.\.?\/assets\/.*\.ttf["']\)/g;

// Files to ignore (already fixed or not relevant)
const ignoreFiles = [
  "fallbackStyles.js",
  "patchFonts.js",
  "fixFontReferences.js",
];

// Search for files recursively
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (ignoreFiles.some((f) => filePath.includes(f))) continue;

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fileList = findFiles(filePath, fileList);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

// Check file for font references
function checkFile(filePath) {
  let foundFontFamilies = false;
  let foundFontImports = false;

  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Check for font families in styles
    const fontMatches = content.match(fontPattern);
    if (fontMatches && fontMatches.length > 0) {
      foundFontFamilies = true;
      console.log(`\n[Found font families in]: ${filePath}`);
      fontMatches.forEach((match) => {
        console.log(`  ${match}`);
      });
    }

    // Check for font imports
    const importMatches = content.match(fontImportPattern);
    if (importMatches && importMatches.length > 0) {
      foundFontImports = true;
      console.log(`\n[Found font imports in]: ${filePath}`);
      importMatches.forEach((match) => {
        console.log(`  ${match}`);
      });
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }

  return { foundFontFamilies, foundFontImports };
}

// Main function
function findFontReferences() {
  console.log("Searching for font references...");
  let totalFontFilesFound = 0;

  dirsToSearch.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      console.log(`Directory not found: ${dir}`);
      return;
    }

    const files = findFiles(dir);
    files.forEach((file) => {
      const { foundFontFamilies, foundFontImports } = checkFile(file);
      if (foundFontFamilies || foundFontImports) {
        totalFontFilesFound++;
      }
    });
  });

  console.log(`\nFound font references in ${totalFontFilesFound} files.`);
  console.log("\nTo fix these files:");
  console.log("1. Remove direct font imports (require statements)");
  console.log("2. Remove fontFamily properties from style objects");
  console.log(
    "3. Import from fallbackStyles.js if you need specific text styles"
  );
}

// Run the function
findFontReferences();
