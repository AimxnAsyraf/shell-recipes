// Turns fenced code blocks in recipe Markdown into ShellRecipes command blocks.
//
// Authoring convention (see CONTRIBUTING.md):
//
//   ```bash linux,macos        -> command for Linux and macOS
//   ```powershell windows      -> command for Windows (PowerShell)
//   ```bash                    -> no OS listed = same command on every OS
//   ```output linux            -> "expected output" block (not copyable)
//   ```bash linux title="Fedora / RHEL"   -> optional label shown in the block header
//
// Consecutive code blocks are grouped; the page's OS switch shows only the blocks
// for the selected OS. Write {{VAR_NAME}} inside a block to make it a fill-in variable
// (declared in the recipe's `variables` frontmatter).

const OSES = ['linux', 'macos', 'windows'];
const OS_NAMES = { linux: 'Linux', macos: 'macOS', windows: 'Windows' };
const SHELL_NAMES = {
  bash: 'bash',
  sh: 'sh',
  zsh: 'zsh',
  powershell: 'PowerShell',
  pwsh: 'PowerShell',
  cmd: 'cmd',
  text: 'text',
  ini: 'config',
  sshconfig: 'config file',
  json: 'JSON',
};

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parseMeta(meta = '') {
  const title = /title="([^"]*)"/.exec(meta)?.[1];
  const rest = meta.replace(/title="[^"]*"/, '');
  const os = rest
    .split(/[\s,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => OSES.includes(t));
  return { title, os: os.length ? os : [...OSES] };
}

function renderCode(value, lang, defaults) {
  const lines = value.split('\n').map((line) => {
    let html = escapeHtml(line);
    const isComment = /^\s*#/.test(line) && lang !== 'output' && lang !== 'json';
    html = html.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_, key) => {
      const v = defaults[key] ?? key;
      return `<span class="var" data-var="${key}">${escapeHtml(v)}</span>`;
    });
    return isComment ? `<span class="c">${html}</span>` : html;
  });
  return lines.join('\n');
}

function renderBlock(node, defaults) {
  const lang = (node.lang || 'bash').toLowerCase();
  const { title, os } = parseMeta(node.meta || '');
  const isOutput = lang === 'output';
  const osLabel = os.length === OSES.length ? 'All systems' : os.map((o) => OS_NAMES[o]).join(' · ');
  const kindLabel = isOutput ? 'Expected output' : SHELL_NAMES[lang] || lang;
  const head = [
    `<span class="cmd-os">${escapeHtml(title || osLabel)}</span>`,
    `<span class="cmd-kind">${escapeHtml(kindLabel)}</span>`,
    isOutput ? '' : '<button class="copy" type="button" aria-label="Copy command">Copy</button>',
  ].join('');
  return (
    `<div class="cmd${isOutput ? ' cmd-output' : ''}" data-os="${os.join(' ')}" data-kind="${isOutput ? 'output' : 'cmd'}">` +
    `<div class="cmd-head">${head}</div>` +
    `<pre><code>${renderCode(node.value, lang, defaults)}</code></pre>` +
    `</div>`
  );
}

function transformChildren(parent, defaults) {
  if (!parent.children) return;
  const out = [];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    out.push({
      type: 'html',
      value:
        `<div class="cmd-group">${group.map((n) => renderBlock(n, defaults)).join('')}` +
        `<p class="cmd-none">Nothing to run on <strong class="cmd-none-os"></strong> for this part.</p></div>`,
    });
    group = [];
  };
  for (const child of parent.children) {
    if (child.type === 'code') {
      group.push(child);
      continue;
    }
    flush();
    // Inline `code` can use {{VAR}} too.
    if (child.type === 'inlineCode' && /\{\{[A-Z][A-Z0-9_]*\}\}/.test(child.value)) {
      out.push({ type: 'html', value: `<code class="cmd-inline">${renderCode(child.value, 'text', defaults)}</code>` });
      continue;
    }
    transformChildren(child, defaults);
    out.push(child);
  }
  flush();
  parent.children = out;
}

export default function remarkRecipe() {
  return (tree, file) => {
    const vars = file?.data?.astro?.frontmatter?.variables ?? [];
    const defaults = Object.fromEntries(vars.map((v) => [v.key, v.default]));
    transformChildren(tree, defaults);
  };
}
