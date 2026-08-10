// src/components/SessionsList.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';

// Escapes the reader's own search terms before they go into a RegExp, so typing
// "C++" or "(preview)" searches for those characters instead of blowing up.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Session body, rendered from the HTML `marked` produced at build time.
// Search terms are wrapped in <mark> by walking the rendered text nodes rather
// than by rewriting the HTML string — a regex over markup would happily match
// inside href="" and tag names.
const SessionBody = ({ html, terms }) => {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !terms.length) return;

    const rx = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'ig');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (const node of textNodes) {
      // split() with a capture group leaves the matches at the odd indices
      const parts = node.nodeValue.split(rx);
      if (parts.length < 2) continue;

      const frag = document.createDocumentFragment();
      parts.forEach((part, i) => {
        if (!part) return;
        if (i % 2 === 1) {
          const mark = document.createElement('mark');
          mark.textContent = part;
          frag.appendChild(mark);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      node.parentNode.replaceChild(frag, node);
    }
  }, [html, terms]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
};

const SessionsList = ({ sessions = [] }) => {
  const INITIAL_SESSIONS = 6;
  const LOAD_MORE_COUNT = 6;
  const [displayCount, setDisplayCount] = useState(INITIAL_SESSIONS);
  const [query, setQuery] = useState('');

  // Terms are ANDed: "drone trinity" only matches sessions containing both.
  const terms = useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );
  const searching = terms.length > 0;

  const matchingSessions = useMemo(() => {
    if (!searching) return sessions;
    return sessions.filter((session) => {
      const hay = `session ${session.number} ${session.title || ''} ${session.text}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [sessions, terms, searching]);

  const visibleSessions = searching ? matchingSessions : sessions.slice(0, displayCount);
  const hasMore = !searching && displayCount < sessions.length;
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

  return (
    <>
      <style>{`
        /* Filter box */
        .session-search {
          width: 100%;
          margin: var(--line-height) 0;
        }
        .session-search::placeholder { color: var(--text-color-alt); }
        .session-search__empty { color: var(--text-color-alt); }
        .session-content mark {
          background: color-mix(in srgb, var(--text-color) 30%, var(--background-color) 70%);
          color: var(--text-color);
        }

        /* Lists inside the session content (emitted by marked) */
        .session-content ul {
          list-style: disc;
          list-style-position: outside;
          padding-left: 2ch;
          margin: var(--line-height) 0;
        }
        .session-content ul li { margin-bottom: 0.5em; }

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
        .image-strip {
          margin-top: var(--line-height);
          border-top: var(--border-thickness) solid var(--text-color); /* black line */
          padding-top: calc(var(--line-height) / 2);
        }

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

        /* Modal styles */
        .image-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: var(--line-height);
          animation: fadeIn 0.2s ease;
          margin: 0;
        }

        @media (prefers-color-scheme: dark) {
          .image-modal {
            background: rgba(0, 0, 0, 0.3);
          }
        }

        @media (prefers-color-scheme: light) {
          .image-modal {
            background: rgba(0, 0, 0, 0.3);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .image-modal img {
          max-width: 90vw;
          max-height: 90vh;
          width: auto;
          height: auto;
          object-fit: contain;
          border: var(--border-thickness) solid var(--text-color);
        }

        .image-modal__close {
          position: fixed;
          top: calc(var(--line-height) * 2);
          right: calc(var(--line-height) * 2);
          width: calc(var(--line-height) * 2);
          height: calc(var(--line-height) * 2);
          background: var(--background-color);
          color: var(--text-color);
          border: var(--border-thickness) solid var(--text-color);
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .image-modal__close:hover {
          background: var(--background-color-alt);
        }

        .image-strip__item {
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .image-strip__item:hover {
          opacity: 0.8;
        }
      `}</style>

      <input
        className="session-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
        placeholder="Search"
        aria-label="Search demos"
      />

      {searching && matchingSessions.length === 0 && (
        <p className="session-search__empty">No demos match “{query}”.</p>
      )}

      {visibleSessions.map((session) => {
        const imgs = imagesBySession[session.number] || [];
        return (
          // Keying on the query remounts on every keystroke, which resets the
          // HTML the highlighter mutated and keeps `open` in step with the mode.
          <details
            key={`${session.number}${searching ? `-${query}` : ''}`}
            className="session-item"
            open={searching || undefined}
          >
            <summary>
              Session {session.number}
              {session.title && session.title !== `Session ${session.number}` ? `: ${session.title}` : ''}
            </summary>

            <div className="session-content">
              <SessionBody html={session.html} terms={terms} />
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
  const [modalImage, setModalImage] = useState(null);

  // Handle modal open/close
  const openModal = (src) => setModalImage(src);
  const closeModal = () => setModalImage(null);

  // Keyboard support for modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && modalImage) closeModal();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [modalImage]);

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
    <>
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
            <div 
              className="image-strip__item" 
              key={i}
              onClick={() => openModal(src)}
              style={{ cursor: 'pointer' }}
            >
              <img src={src} alt={`Session image ${i + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      {/* Modal overlay */}
      {modalImage && (
        <div 
          className="image-modal"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <button 
            className="image-modal__close" 
            onClick={closeModal}
            aria-label="Close image"
          >
            ×
          </button>
          <img 
            src={modalImage} 
            alt="Enlarged view"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
