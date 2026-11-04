// Wraps each `## Heading` section of a recipe into a numbered, checkable step.
// Headings that start with "Troubleshooting", "Next steps", "Clean up" or "Going further"
// become unnumbered extra sections instead of steps.

const EXTRA = /^(troubleshooting|next steps|clean ?up|going further|undo)/i;

const textOf = (node) =>
  node.type === 'text' ? node.value : (node.children || []).map(textOf).join('');

const el = (tagName, properties, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

export default function rehypeSteps() {
  return (tree) => {
    const intro = [];
    const sections = [];
    let current = null;

    for (const node of tree.children) {
      if (node.type === 'element' && node.tagName === 'h2') {
        current = { heading: node, body: [] };
        sections.push(current);
      } else if (current) {
        current.body.push(node);
      } else {
        intro.push(node);
      }
    }
    if (!sections.length) return;

    let n = 0;
    const wrapped = sections.map(({ heading, body }) => {
      const isExtra = EXTRA.test(textOf(heading).trim());
      if (isExtra) {
        return el('section', { className: ['step', 'step-extra'] }, [
          el('div', { className: ['step-head'] }, [heading]),
          el('div', { className: ['step-body'] }, body),
        ]);
      }
      n += 1;
      return el('section', { className: ['step'], id: `step-${n}`, dataStep: String(n) }, [
        el('div', { className: ['step-head'] }, [
          el('span', { className: ['step-num'], ariaHidden: 'true' }, [{ type: 'text', value: String(n) }]),
          heading,
          el('label', { className: ['step-done'] }, [
            el('input', { type: 'checkbox', dataStep: String(n) }),
            el('span', {}, [{ type: 'text', value: 'Done' }]),
          ]),
        ]),
        el('div', { className: ['step-body'] }, body),
      ]);
    });

    tree.children = [el('div', { className: ['recipe-intro'] }, intro), ...wrapped];
  };
}
