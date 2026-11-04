// Lints recipe Markdown files for common authoring mistakes.
// Usage: npm run check:recipes
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../src/recipes/', import.meta.url).pathname;
const OSES = ['linux', 'macos', 'windows'];
let problems = 0;
const fail = (file, msg) => {
  problems++;
  console.error(`✗ ${file}: ${msg}`);
};

for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
  const text = readFileSync(join(dir, file), 'utf8');
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!fm) {
    fail(file, 'missing frontmatter');
    continue;
  }
  const body = text.slice(fm[0].length);

  // Declared variables vs. used variables
  const declared = new Set([...fm[1].matchAll(/^\s*-\s*key:\s*([A-Z][A-Z0-9_]*)/gm)].map((m) => m[1]));
  const used = new Set([...body.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)].map((m) => m[1]));
  for (const v of used) if (!declared.has(v)) fail(file, `{{${v}}} is used but not declared in variables`);
  for (const v of declared) if (!used.has(v)) fail(file, `variable ${v} is declared but never used`);

  // Sources and verified date
  if (!/^sources:\s*\n\s*-\s*title:/m.test(fm[1])) fail(file, 'needs at least one source');
  if (!/^verified:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(fm[1])) fail(file, 'verified must be YYYY-MM-DD');

  // Code fences must be closed, and OS tokens must be valid
  const fences = [...body.matchAll(/^```(.*)$/gm)];
  if (fences.length % 2 !== 0) fail(file, 'unclosed ``` code fence');
  fences
    .filter((_, i) => i % 2 === 0)
    .forEach((m) => {
      const meta = m[1].replace(/title="[^"]*"/, '').trim().split(/[\s,]+/).slice(1);
      for (const t of meta) if (t && !OSES.includes(t)) fail(file, `unknown OS "${t}" in \`\`\`${m[1]}`);
    });

  if (!/^##\s+/m.test(body)) fail(file, 'no ## steps found');
  if (problems === 0) console.log(`✓ ${file}`);
}

if (problems) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll recipes look good.');
