/** Join a site-relative path onto the configured base (works for "/" and "/shell-recipes"). */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const clean = path.replace(/^\/+/, '');
  return `${base}/${clean}`;
}

export const OS_LABELS = {
  linux: { name: 'Linux', shell: 'bash' },
  macos: { name: 'macOS', shell: 'Terminal · zsh' },
  windows: { name: 'Windows', shell: 'Windows Terminal · PowerShell' },
} as const;
