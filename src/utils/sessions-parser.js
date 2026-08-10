// src/utils/sessions-parser.js
import { Marked } from 'marked';

// The site is an index of other people's work, so every link leaves the site.
const marked = new Marked({
	renderer: {
		link({ href, title, tokens }) {
			const text = this.parser.parseInline(tokens);
			return `<a href="${href}"${title ? ` title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${text}</a>`;
		},
	},
});

// "## Session 61" / "## Session 13 - Open House!". This matches our own naming
// convention on already-parsed heading text — it is not markdown parsing.
const SESSION_HEADING = /^Session\s+(\d+)\s*[:–—-]*\s*(.*)$/i;

// Walk the token tree for the words a reader actually sees: link text counts,
// the URL behind it does not. Used for search.
function plainText(tokens = []) {
	let out = '';
	for (const token of tokens) {
		if (token.items) out += `${plainText(token.items)} `;
		else if (token.tokens) out += `${plainText(token.tokens)} `;
		else if (typeof token.text === 'string') out += `${token.text} `;
	}
	return out;
}

export function parseSessionsMarkdown(markdown) {
	if (typeof markdown !== 'string') return [];

	const sessions = [];
	let current = null;

	// Everything after a "## Session N" heading belongs to that session,
	// until the next one.
	for (const token of marked.lexer(markdown)) {
		const heading =
			token.type === 'heading' && token.depth === 2 && SESSION_HEADING.exec(token.text);

		if (heading) {
			current = { number: Number(heading[1]), title: heading[2].trim(), tokens: [] };
			sessions.push(current);
		} else if (current) {
			current.tokens.push(token);
		}
	}

	return sessions
		.map(({ number, title, tokens }) => ({
			number,
			title,
			html: marked.parser(tokens),
			text: plainText(tokens).replace(/\s+/g, ' ').trim(),
		}))
		.sort((a, b) => b.number - a.number); // newest first
}
