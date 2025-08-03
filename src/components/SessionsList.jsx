// src/components/SessionsList.jsx
import React, { useState } from 'react';

const SessionsList = ({ sessions = [] }) => {
  const INITIAL_SESSIONS = 6;
  const LOAD_MORE_COUNT = 6;
  const [displayCount, setDisplayCount] = useState(INITIAL_SESSIONS);

  const visibleSessions = sessions.slice(0, displayCount);
  const hasMore = displayCount < sessions.length;
  const remainingCount = sessions.length - displayCount;

  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, sessions.length));
  };

  const showAll = () => {
    setDisplayCount(sessions.length);
  };

  // Helper: parse a line with markdown links [text](url) into JSX parts
  const parseInlineLinks = (text, keyPrefix) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length ? parts : text;
  };

  // Render content as paragraphs and real <ul><li> lists
  const renderContent = (content) => {
    if (!content) return null;

    const lines = content.split('\n');

    const blocks = [];
    let currentList = [];

    const flushList = (flushKey) => {
      if (currentList.length) {
        blocks.push(
          <ul key={`ul-${flushKey}`} className="session-list">
            {currentList.map((li, i) => (
              <li key={`li-${flushKey}-${i}`}>{li}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) return;

      // Accept either "• " (your parser output) or "- " / "* " (fallback)
      const bulletMatch = line.match(/^(?:• |- |\* )(.*)$/);
      if (bulletMatch) {
        const bulletText = bulletMatch[1];
        currentList.push(parseInlineLinks(bulletText, `line-${idx}`));
        return;
      }

      // Non-bullet: flush any open list, then push a paragraph
      flushList(idx);
      blocks.push(<p key={`p-${idx}`}>{parseInlineLinks(line, `p-${idx}`)}</p>);
    });

    // Flush trailing list
    flushList('last');

    return blocks;
  };

  return (
    <>
      <style>{`
        /* Use real unordered lists inside the session blocks */
        .session-content ul.session-list {
          list-style: disc;
          list-style-position: outside;
          padding-left: 2ch;
          margin: var(--line-height) 0;
        }

        .session-content ul.session-list li {
          margin-bottom: 0.5em;
        }

        /* Remove previous custom bullet styling */
        /* (No ::before bullets anymore) */

        /* Optional: style the load-more row exactly like a session header */
        details.session-item.load-more summary {
          user-select: none;
        }
      `}</style>

      {visibleSessions.map((session) => (
        <details key={session.number} className="session-item">
          <summary>
            Session {session.number}
            {session.title && session.title !== `Session ${session.number}` ? `: ${session.title}` : ''}
          </summary>
          <div className="session-content">
            {renderContent(session.content)}
          </div>
        </details>
      ))}

      {hasMore && (
        <details
          className="session-item load-more"
          /* Keep it visually identical; prevent toggle on click */
          onToggle={(e) => {
            // If the browser tries to open it (e.g., via keyboard), immediately close
            if (e.currentTarget.open) {
              e.currentTarget.open = false;
            }
          }}
        >
          <summary
            onClick={(e) => {
              e.preventDefault(); // don't toggle the <details>
              loadMore();
            }}
            title={`Load ${Math.min(LOAD_MORE_COUNT, remainingCount)} more`}
          >
            Load more sessions…
          </summary>
        </details>
      )}
    </>
  );
};

export default SessionsList;
