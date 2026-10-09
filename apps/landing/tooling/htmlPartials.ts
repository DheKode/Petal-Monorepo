import {readFile} from 'node:fs/promises';
import {dirname, extname, isAbsolute, relative, resolve, sep} from 'node:path';
import type {Plugin} from 'vite';

/** Resolve source-relative includes before Vite processes the static document. */
export async function expandHtmlPartials(
  html: string,
  filename: string,
  root: string,
  onInclude: (file: string) => void = () => {},
  ancestors: string[] = [filename],
): Promise<string> {
  const pattern = /<!--\s*@include\s+([^\s]+)\s*-->/g;
  let output = '';
  let offset = 0;
  for (const match of html.matchAll(pattern)) {
    const file = resolve(dirname(filename), match[1]!);
    const local = relative(root, file);
    if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`) || extname(file) !== '.html') {
      throw new Error(`HTML include must be an .html file inside the landing app: ${file}`);
    }
    if (ancestors.includes(file)) throw new Error(`Circular HTML include: ${[...ancestors, file].join(' -> ')}`);
    onInclude(file);
    const content = await readFile(file, 'utf8');
    output += html.slice(offset, match.index);
    output += await expandHtmlPartials(content, file, root, onInclude, [...ancestors, file]);
    offset = match.index! + match[0].length;
  }
  return output + html.slice(offset);
}

export function htmlPartials(): Plugin {
  let root = '';
  const included = new Set<string>();
  return {
    name: 'petal-html-partials',
    configResolved(config) { root = config.root; },
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        return expandHtmlPartials(html, context.filename, root, (file) => {
          included.add(file);
          context.server?.watcher.add(file);
        });
      },
    },
    handleHotUpdate({file, server}) {
      if (included.has(file)) {
        server.ws.send({type: 'full-reload'});
        return [];
      }
    },
  };
}
