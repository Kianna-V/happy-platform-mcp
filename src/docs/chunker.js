function headingText(line) {
  const match = line.match(/^#{1,6}\s+(.+)$/);
  return match ? match[1].trim() : null;
}

export function chunkMarkdown({ family, path, markdown }) {
  const lines = markdown.split(/\r?\n/);
  const title = lines.map(headingText).find(Boolean) || path;
  const chunks = [];
  let current = null;

  function flush(endLine) {
    if (!current) return;
    const body = current.lines.join('\n').trim();
    if (body) {
      chunks.push({
        family,
        path,
        title,
        heading: current.heading,
        startLine: current.startLine,
        endLine,
        body
      });
    }
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const heading = headingText(line);
    if (heading) {
      flush(lineNumber - 1);
      current = {
        heading,
        startLine: lineNumber,
        lines: [line]
      };
      return;
    }

    if (!current) {
      current = {
        heading: title,
        startLine: lineNumber,
        lines: []
      };
    }
    current.lines.push(line);
  });

  flush(lines.length);
  return chunks;
}
