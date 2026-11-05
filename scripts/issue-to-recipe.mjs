// Converts an approved "Submit a new recipe" issue (GitHub issue form) into src/recipes/<slug>.md.
//
// Usage:
//   node scripts/issue-to-recipe.mjs <github-event.json>          (in GitHub Actions: $GITHUB_EVENT_PATH)
//   node scripts/issue-to-recipe.mjs --body <file> --title <text> --author <login> [--issue <n>] [--date YYYY-MM-DD]
//
// The recipe title is the issue title (a "Recipe:" prefix is removed). Issues made with the
// older form, which had its own "Title" field, still use that field.
//
// Everything in the issue is untrusted input: values are quoted as YAML strings, and raw HTML in
// prose is escaped so a submission can't inject markup or scripts into the site.
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const ROOT = new URL('..', import.meta.url).pathname;
const CATEGORIES = JSON.parse(readFileSync(join(ROOT, 'src/data/categories.json'), 'utf8'));
const OSES = { Linux: 'linux', macOS: 'macos', Windows: 'windows' };
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

// Form labels (must match .github/ISSUE_TEMPLATE/new-recipe.yml) -> field ids.
const FIELDS = {
  Title: 'title', // old forms only: the recipe title now comes from the issue title
  Summary: 'summary',
  Category: 'category',
  Tags: 'tags',
  Difficulty: 'difficulty',
  'Time needed': 'time',
  'Operating systems covered': 'os',
  'Before you start': 'prerequisites',
  'Fill-in values': 'variables',
  Intro: 'intro',
  Steps: 'steps',
  Troubleshooting: 'troubleshooting',
  'Clean up / undo': 'cleanup',
  Sources: 'sources',
  'Notes for the reviewer': 'notes',
  Checklist: 'confirm',
};

export function parseIssueBody(body) {
  const out = {};
  let current = null;
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    const m = /^### (.+?)\s*$/.exec(line);
    if (m && FIELDS[m[1]]) {
      current = FIELDS[m[1]];
      out[current] = [];
      continue;
    }
    if (current) out[current].push(line);
  }
  for (const k of Object.keys(out)) {
    const v = out[k].join('\n').trim();
    out[k] = v === '_No response_' ? '' : v;
  }
  return out;
}

const yaml = (s) => JSON.stringify(String(s)); // JSON strings are valid YAML double-quoted scalars
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Escape raw HTML tags in Markdown prose, leaving fenced code blocks and `inline code` untouched. */
export function neutralizeHtml(md) {
  let inFence = false;
  return md
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line
        .split(/(`[^`]*`)/)
        .map((part) => (part.startsWith('`') ? part : part.replace(/<(?=[A-Za-z!/?])/g, '&lt;')))
        .join('');
    })
    .join('\n');
}

/** True if Markdown contains a javascript:/data:/vbscript: link (inline or reference style). */
export function hasUnsafeLink(md) {
  return /\]\(\s*<?\s*(javascript|data|vbscript):/i.test(md) || /^\s*\[[^\]]+\]:\s*<?\s*(javascript|data|vbscript):/im.test(md);
}

export function slugify(title) {
  return (
    title
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'recipe'
  );
}

export function buildRecipe(f, { author, date, issueTitle = '' }) {
  if (!f.title) f.title = issueTitle;
  const errors = [];
  const need = (k, label) => {
    if (!f[k]) errors.push(`"${label}" is empty.`);
  };
  need('title', 'Title (the issue title)');
  need('summary', 'Summary');
  need('time', 'Time needed');
  need('steps', 'Steps');
  need('sources', 'Sources');

  const title = (f.title || '').replace(/^Recipe:\s*/i, '').trim();
  if (!CATEGORIES.includes(f.category)) errors.push(`Category "${f.category}" is not in the list.`);
  if (!DIFFICULTIES.includes(f.difficulty)) errors.push(`Difficulty "${f.difficulty}" is not valid.`);

  const os = [...(f.os || '').matchAll(/^- \[[xX]\] (Linux|macOS|Windows)\s*$/gm)].map((m) => OSES[m[1]]);
  if (!os.length) errors.push('Tick at least one operating system.');

  const tags = (f.tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 15);

  const prerequisites = (f.prerequisites || '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean)
    .map((l) => escapeHtml(l).replace(/`([^`]+)`/g, '<code>$1</code>'));

  const variables = [];
  for (const line of (f.variables || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [key, label, def, hint] = line.split('|').map((p) => p.trim());
    if (!/^[A-Z][A-Z0-9_]*$/.test(key || '')) {
      errors.push(`Fill-in value "${line}": KEY must be UPPER_SNAKE_CASE.`);
      continue;
    }
    if (!label || def === undefined) {
      errors.push(`Fill-in value "${line}": use KEY | Label | default | hint.`);
      continue;
    }
    variables.push({ key, label, default: def, hint });
  }

  const sources = [];
  for (const line of (f.sources || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [stitle, url, publisher, sdate] = line.replace(/^[-*]\s+/, '').split('|').map((p) => p.trim());
    if (!stitle || !/^https:\/\/[^\s]+$/.test(url || '') || !publisher) {
      errors.push(`Source "${line}": use Title | https://url | Publisher | date.`);
      continue;
    }
    sources.push({ title: stitle, url, publisher, date: sdate || undefined });
  }
  if (f.sources && !sources.length) errors.push('Add at least one valid source.');

  const steps = (f.steps || '').trim();
  if (steps && !/^## \S/m.test(steps)) errors.push('Steps must start each step with "## Step title".');
  if (/^#\s/m.test(steps)) errors.push('Use "## " for steps, not "# ".');
  const prose = [f.intro, steps, f.troubleshooting, f.cleanup].join('\n');
  if (hasUnsafeLink(prose)) errors.push('Links must use http(s) URLs (javascript:, data: and vbscript: links are not allowed).');

  if (errors.length) return { errors };

  const fm = [
    '---',
    `title: ${yaml(title)}`,
    `summary: ${yaml(f.summary.replace(/\s+/g, ' ').trim())}`,
    `category: ${yaml(f.category)}`,
    `tags: [${tags.map(yaml).join(', ')}]`,
    `difficulty: ${f.difficulty}`,
    `time: ${yaml(f.time.trim())}`,
    `os: [${os.join(', ')}]`,
    `verified: ${date}`,
    `author: ${yaml(author)}`,
  ];
  if (prerequisites.length) fm.push('prerequisites:', ...prerequisites.map((p) => `  - ${yaml(p)}`));
  if (variables.length) {
    fm.push('variables:');
    for (const v of variables) {
      fm.push(`  - key: ${v.key}`, `    label: ${yaml(v.label)}`, `    default: ${yaml(v.default)}`);
      if (v.hint) fm.push(`    hint: ${yaml(v.hint)}`);
    }
  }
  fm.push('sources:');
  for (const s of sources) {
    fm.push(`  - title: ${yaml(s.title)}`, `    url: ${yaml(s.url)}`, `    publisher: ${yaml(s.publisher)}`);
    if (s.date) fm.push(`    date: ${yaml(s.date)}`);
  }
  fm.push('---', '');

  const body = [];
  if (f.intro) body.push(neutralizeHtml(f.intro), '');
  body.push(neutralizeHtml(steps), '');
  if (f.troubleshooting) body.push('## Troubleshooting', '', neutralizeHtml(f.troubleshooting), '');
  if (f.cleanup) body.push('## Clean up', '', neutralizeHtml(f.cleanup), '');

  return { title, slug: slugify(title), markdown: fm.join('\n') + '\n' + body.join('\n').replace(/\n{3,}/g, '\n\n') };
}

// ---- CLI ----
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  let body, author, issue, issueTitle;
  let date = new Date().toISOString().slice(0, 10);
  if (args[0] && !args[0].startsWith('--')) {
    const ev = JSON.parse(readFileSync(args[0], 'utf8'));
    body = ev.issue.body || '';
    issueTitle = ev.issue.title || '';
    author = ev.issue.user.login;
    issue = ev.issue.number;
  } else {
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] === '--body') body = readFileSync(args[i + 1], 'utf8');
      if (args[i] === '--author') author = args[i + 1];
      if (args[i] === '--title') issueTitle = args[i + 1];
      if (args[i] === '--issue') issue = args[i + 1];
      if (args[i] === '--date') date = args[i + 1];
    }
  }
  const result = buildRecipe(parseIssueBody(body), { author, date, issueTitle });
  // Random heredoc delimiters so submitted text can't end a GITHUB_OUTPUT value early.
  const delim = () => `EOF_${randomBytes(12).toString('hex')}`;
  if (result.errors) {
    const msg = result.errors.map((e) => `- ${e}`).join('\n');
    console.error(`Could not build the recipe:\n${msg}`);
    if (process.env.GITHUB_OUTPUT) {
      const d = delim();
      appendFileSync(process.env.GITHUB_OUTPUT, `errors<<${d}\n${msg}\n${d}\n`);
    }
    process.exit(1);
  }
  let slug = result.slug;
  for (let n = 2; existsSync(join(ROOT, 'src/recipes', `${slug}.md`)); n++) slug = `${result.slug}-${n}`;
  const file = `src/recipes/${slug}.md`;
  writeFileSync(join(ROOT, file), result.markdown);
  console.log(`Wrote ${file}${issue ? ` from issue #${issue}` : ''}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\nfile=${file}\n`);
    const d = delim();
    appendFileSync(process.env.GITHUB_OUTPUT, `title<<${d}\n${result.title}\n${d}\n`);
  }
}
