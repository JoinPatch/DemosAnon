// src/components/SessionsList.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';

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

  // --- Build-time image discovery (Vite) -------------------------------------
  // We eagerly import URLs to all images inside src/data/sessions/session{N}/
  const imagesBySession = useMemo(() => {
    // NOTE: pattern is relative to this file. Adjust if you move directories.
    const modules = import.meta.glob(
      '../data/sessions/**/**/*.{png,jpg,jpeg,webp,gif}',
      { eager: true, as: 'url' }
    );

    const grouped = {};
    for (const [path, url] of Object.entries(modules)) {
      // Extract the session number from ".../session29/filename.jpg"
      const m = path.match(/session(\d+)[/\\][^/\\]+\.(?:png|jpe?g|webp|gif)$/i);
      if (!m) continue;
      const num = Number(m[1]);
      if (!grouped[num]) grouped[num] = [];
      grouped[num].push({ url, path });
    }

    // Optional: stable ordering by filename
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.path.localeCompare(b.path));
      grouped[key] = grouped[key].map(x => x.url); // keep only URLs for rendering
    }
    return grouped;
  }, []);
  // ---------------------------------------------------------------------------

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
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
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

      // Accept either "• " (parser output) or "- " / "* " (fallback)
      const bulletMatch = line.match(/^(?:• |- |\* )(.*)$/);
      if (bulletMatch) {
        currentList.push(parseInlineLinks(bulletMatch[1], `line-${idx}`));
        return;
      }

      flushList(idx);
      blocks.push(<p key={`p-${idx}`}>{parseInlineLinks(line, `p-${idx}`)}</p>);
    });

    flushList('last');
    return blocks;
  };

  return (
    <>
      <style>{`
        /* Lists inside the session content */
        .session-content ul.session-list {
          list-style: disc;
          list-style-position: outside;
          padding-left: 2ch;
          margin: var(--line-height) 0;
        }
        .session-content ul.session-list li { margin-bottom: 0.5em; }

        /* Load-more row behaves like a header, without the marker */
        details.session-item.load-more summary {
          user-select: none;
          list-style: none;
          cursor: pointer;
        }
        details.session-item.load-more summary::marker,
        details.session-item.load-more summary::-webkit-details-marker {
          display: none;
        }

        /* Image strip (subtle carousel) */
        .image-strip__scroller {
          display: flex;
          gap: 1ch;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 0.25rem;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;

          /* ensure all tiles share the same top baseline */
          align-items: flex-start;
        }

        /* override the global * + * margin for tiles inside the strip */
        .image-strip__scroller > * + * {
          margin-top: 0 !important;
        }

        .image-strip__item {
          flex: 0 0 auto;
          height: 10rem;
          width: auto;
          aspect-ratio: 4 / 3;
          scroll-snap-align: start;
          border: var(--border-thickness) solid var(--text-color);
          background: var(--background-color-alt);
          display: flex;
          align-items: center;
          justify-content: center;

          /* avoid box-model surprises at fixed height */
          box-sizing: border-box;
        }

        .image-strip__item img {
          display: block;
          height: 100%;
          width: 100%;
          object-fit: cover; /* or 'contain' if you prefer letterboxing */
        }

        /* Arrow buttons appear only when overflow exists */
        .image-strip__nav {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          gap: 0.5ch;
          transform: translateY(-100%);
        }
        .image-strip__btn {
          height: calc(var(--line-height) * 1.4);
          padding: 0 0.8ch;
          line-height: calc(var(--line-height) * 1.4);
        }
      `}</style>

      {visibleSessions.map((session) => {
        const imgs = imagesBySession[session.number] || [];
        return (
          <details key={session.number} className="session-item">
            <summary>
              Session {session.number}
              {session.title && session.title !== `Session ${session.number}` ? `: ${session.title}` : ''}
            </summary>

            <div className="session-content">
              {renderContent(session.content)}
              {imgs.length > 0 && <ImageStrip images={imgs} />}
            </div>
          </details>
        );
      })}

      {hasMore && (
        <details
          className="session-item load-more"
          onToggle={(e) => {
            // Never leave this open (keyboard users); keep visual parity with session headers
            if (e.currentTarget.open) e.currentTarget.open = false;
          }}
        >
          <summary
            onClick={(e) => {
              e.preventDefault();
              loadMore();
            }}
            title={`Load ${Math.min(LOAD_MORE_COUNT, remainingCount)} more`}
          >
            Load more…
          </summary>
        </details>
      )}
    </>
  );
};

export default SessionsList;

/* ---- ImageStrip: tiny horizontal carousel --------------------------------- */
const ImageStrip = ({ images }) => {
  const scrollerRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Re-check overflow whenever size changes or images load
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const check = () => {
      // +4 as a small tolerance for sub-pixel rounding
      setHasOverflow(el.scrollWidth > el.clientWidth + 4);
    };

    // Initial + resize-based checks
    const ro = new ResizeObserver(check);
    ro.observe(el);

    // Also re-check once images actually load (intrinsic sizes)
    const imgs = Array.from(el.querySelectorAll('img'));
    const onLoad = () => check();
    imgs.forEach(img => img.addEventListener('load', onLoad, { once: true }));

    // Tiny post-mount tick in case layout settles late
    const t = setTimeout(check, 0);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      imgs.forEach(img => img.removeEventListener('load', onLoad));
    };
  }, [images]);

  // Optional arrow buttons (kept simple); hide when no overflow
  const scrollByAmount = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.9, 200);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className="image-strip" style={{ '--strip-height': '9rem' }}>
      {hasOverflow && (
        <div className="image-strip__nav" aria-hidden="true">
          <button className="image-strip__btn" onClick={() => scrollByAmount(-1)} aria-label="Scroll images left">
            ◀
          </button>
          <button className="image-strip__btn" onClick={() => scrollByAmount(1)} aria-label="Scroll images right">
            ▶
          </button>
        </div>
      )}
      <div
        className="image-strip__scroller"
        ref={scrollerRef}
        data-overflow={hasOverflow ? 'true' : 'false'}
      >
        {images.map((src, i) => (
          <div className="image-strip__item" key={i}>
            <img src={src} alt={`Session image ${i + 1}`} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
};
