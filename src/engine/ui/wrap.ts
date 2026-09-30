/** Greedy word-wrap for a fixed-width font. Explicit '\n' forces a break. */
export function wrap(text: string, cols: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      let w = word;
      while (w.length > cols) { // hard-split absurdly long words
        if (line) { out.push(line); line = ''; }
        out.push(w.slice(0, cols)); w = w.slice(cols);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= cols) line += ' ' + w;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}
/** Group wrapped lines into pages of `perPage` lines. */
export function paginate(text: string, cols: number, perPage = 2): string[] {
  const lines = wrap(text, cols);
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage).join('\n'));
  return pages;
}
