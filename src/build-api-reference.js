#!/usr/bin/.env node

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Build script for API Reference Data
 * Fetches GUIDE.md from remote and generates forgefyOperators array for playground
 */

// Load environment variables from .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
      }
    }
  });

  return env;
}

// Load .env file and merge with process.env
const env = { ...loadEnvFile(), ...process.env };

const GUIDE_URL = env.GUIDE_URL || 'https://raw.githubusercontent.com/DMBerlin/json-forgefy/refs/heads/main/GUIDE.md';
const OUTPUT_PATH = path.join(__dirname, 'api-reference-data.js');

// Category icon mapping
const categoryIcons = {
  'Math': '🔢',
  'String': '📝',
  'Type': '🔄',
  'Comparison': '⚖️',
  'Logical': '🔀',
  'Conditional': '🔀',
  'Array': '📊',
  'Date': '📅'
};

function fetchGuide() {
  return new Promise((resolve, reject) => {
    console.log('📖 Fetching GUIDE.md from remote...');
    console.log(`   URL: ${GUIDE_URL}`);

    https.get(GUIDE_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch GUIDE.md: ${res.statusCode} ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('✅ Successfully fetched GUIDE.md');
        resolve(data);
      });
    }).on('error', (err) => {
      reject(new Error(`Failed to fetch GUIDE.md: ${err.message}`));
    });
  });
}

function parseGuide(content) {
  console.log('📖 Parsing GUIDE.md...');

  const operators = [];

  // Split by operator sections (### OperatorName)
  const sections = content.split(/^### /m).slice(1); // Remove header

  for (const section of sections) {
    const lines = section.split('\n');
    const operatorName = lines[0].trim();

    // Skip non-operator sections
    if (!operatorName.startsWith('$')) continue;

    const operator = {
      op: operatorName,
      desc: '',
      category: '',
      usage: '',
      params: '',
      returns: '',
      example: '',
      notes: ''
    };

    // Parse metadata
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('**Description**:')) {
        operator.desc = line.replace('**Description**:', '').trim();
      } else if (line.startsWith('**Category**:')) {
        operator.category = line.replace('**Category**:', '').trim();
      } else if (line.startsWith('**Parameters**:')) {
        // Collect multi-line parameters
        let params = [];
        i++;
        while (i < lines.length && lines[i].startsWith('-')) {
          params.push(lines[i].replace(/^-\s*/, '').trim());
          i++;
        }
        operator.params = params.join(', ').replace(/`/g, '');
        i--; // Back up one line
      } else if (line.startsWith('**Returns**:')) {
        operator.returns = line.replace('**Returns**:', '').trim().replace(/`/g, '');
      } else if (line.startsWith('**Example**:')) {
        // Find the first code block after Example
        let exampleStart = i;
        while (i < lines.length && !lines[i].includes('```typescript')) {
          i++;
        }
        if (i < lines.length) {
          i++; // Skip ```typescript
          let exampleLines = [];
          while (i < lines.length && !lines[i].includes('```')) {
            const exLine = lines[i];
            // Skip comments and empty lines, get first valid example
            if (exLine.trim() && !exLine.trim().startsWith('//') && !exLine.trim().startsWith('*')) {
              exampleLines.push(exLine);
              // Get just the first example
              if (exLine.includes('{') && exLine.includes('}')) {
                break;
              }
            }
            i++;
          }

          if (exampleLines.length > 0) {
            operator.example = exampleLines.join(' ').trim();

            // Clean up the example - extract just the operator part
            const match = operator.example.match(/\{[^}]*\$[^}]*\}/);
            if (match) {
              operator.example = match[0];

              // Add result if present in next few lines
              for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                if (lines[j].includes('// Result:')) {
                  const result = lines[j].replace('// Result:', '').trim();
                  operator.example = `${operator.example} → ${result}`;
                  break;
                }
              }
            }
          }
        }
      } else if (line.startsWith('**Notes**:')) {
        operator.notes = line.replace('**Notes**:', '').trim();
      }
    }

    // Set usage from description if not set
    if (!operator.usage) {
      operator.usage = operator.desc;
    }

    // Only add if we have minimum required fields
    if (operator.op && operator.desc && operator.category) {
      operators.push(operator);
    }
  }

  console.log(`✅ Parsed ${operators.length} operators`);
  return operators;
}

function generateJavaScript(operators) {
  console.log('🔧 Generating JavaScript data...');

  const js = `// Auto-generated from GUIDE.md - DO NOT EDIT MANUALLY
// Fetched from: ${GUIDE_URL}
// Run: node build-api-reference.js to regenerate

const forgefyOperators = ${JSON.stringify(operators, null, 2)};

// Export for use in playground
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { forgefyOperators };
}
`;

  fs.writeFileSync(OUTPUT_PATH, js);
  console.log(`✅ Generated: ${OUTPUT_PATH}`);
}

async function main() {
  try {
    const content = await fetchGuide();
    const operators = parseGuide(content);
    generateJavaScript(operators);
    console.log('🎉 API reference data build complete!');

    // Print summary by category
    const byCategory = {};
    operators.forEach(op => {
      byCategory[op.category] = (byCategory[op.category] || 0) + 1;
    });

    console.log('\n📊 Operators by category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        const icon = categoryIcons[cat] || '📌';
        console.log(`   ${icon} ${cat}: ${count}`);
      });

  } catch (error) {
    console.error('❌ Error building API reference:', error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchGuide, parseGuide, generateJavaScript };

