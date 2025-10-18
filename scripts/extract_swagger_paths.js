const fs = require('fs');
const path = require('path');

const swaggerPath = path.join(__dirname, '..', 'public', 'swagger.json');
const outPath = path.join(__dirname, '..', 'ENDPOINTS_SWAGGER.txt');

if (!fs.existsSync(swaggerPath)) {
  console.error('swagger.json not found at', swaggerPath);
  process.exit(2);
}

const raw = fs.readFileSync(swaggerPath, 'utf8');
let doc;
try {
  doc = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse swagger.json:', e.message);
  process.exit(3);
}

const pathsObj = doc.paths && typeof doc.paths === 'object' ? doc.paths : {};

// Collect method + path lines
const lines = [];
for (const [p, methods] of Object.entries(pathsObj)) {
  for (const method of Object.keys(methods)) {
    lines.push(`${method.toUpperCase()} ${p}`);
  }
}

lines.sort((a, b) => {
  // sort by path then method
  const [ma, pa] = a.split(' ', 2);
  const [mb, pb] = b.split(' ', 2);
  if (pa === pb) return ma.localeCompare(mb);
  return pa.localeCompare(pb);
});

fs.writeFileSync(outPath, lines.join('\n') + (lines.length ? '\n' : ''));
console.log(`Wrote ${lines.length} method+path lines to ${outPath}`);
