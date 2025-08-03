// src/utils/sessions-parser.js
export function parseSessionsMarkdown(markdown) {
	if (typeof markdown !== 'string') return [];
  
	// 1) Normalise input (strip BOM, unify line endings)
	const src = markdown
	  .replace(/\uFEFF/g, '')         // strip BOM if present
	  .replace(/\r\n?/g, '\n');       // CRLF/CR -> LF
  
	const sessions = [];
  
	// 2) Robust heading matcher:
	//    - start of file or newline
	//    - "##" (optional spaces) "Session" (spaces) <number> (rest of line = title)
	//    - capture content until the next "## Session <number>" or end of string
	const RE = /(?:^|\n)##\s*Session\s+(\d+)([^\n]*)\n([\s\S]*?)(?=(?:\n##\s*Session\s+\d+)|\n?$)/g;
  
	let m;
	while ((m = RE.exec(src)) !== null) {
	  const number = parseInt(m[1], 10);
  
	  // Title is "whatever remains on that heading line" (after the number)
	  // Clean common separators like " - ", " — ", " : " etc.
	  let title = (m[2] || '').trim().replace(/^[\s:–—-]+/, '').trim();
  
	  // Body is everything until the next session header
	  let body = (m[3] || '').trim();
  
	  // 3) Convert markdown list bullets to your '• ' convention
	  const lines = body.split('\n').map(line => {
		// Preserve images and headings verbatim
		if (/^\s*!\[/.test(line) || /^\s*#+\s/.test(line)) return line;
  
		// Turn "- " or "* " (with optional indentation) into "• "
		if (/^\s*[-*]\s+/.test(line)) {
		  return '• ' + line.replace(/^\s*[-*]\s+/, '');
		}
  
		// Leave everything else as-is (paragraphs, links inline, etc.)
		return line;
	  });
  
	  body = lines.filter(l => l.trim() !== '').join('\n');
  
	  sessions.push({
		number,
		title: title || '',
		content: body,
	  });
	}
  
	// 4) Newest first
	sessions.sort((a, b) => b.number - a.number);
  
	return sessions;
  }
  