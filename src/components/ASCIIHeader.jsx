import React, { useState, useEffect, useRef } from 'react';

console.log("made by tim: https://timfarrelly.com");
console.log("code: https://github.com/timf34/DemosAnon");

// Configuration flag - set to false to hide the grid
const SHOW_GRID = false;

// 📌 New configuration for centering and padding
const CENTER_ASCII = true; // Set to true to center the DEMOS text
const HORIZONTAL_PADDING = 2; // Characters of padding on each side (when applicable)

// ASCII art for "Demos" - will be used as fixed background
const DEMOS_ASCII = [
  'MM"""Yb.                                             ',
  'MM    `Yb.                                           ',
  'MM     `Mb  .gP"Ya   MMpMMMb.pMMMb.  ,pW"Wq.  ,pP"Yb.',
  'MM      MM ,M\'   Yb  MM    MM    MM 6W\'   `Wb 8I   `"',
  'MM     ,MP 8M""""""  MM    MM    MM 8M     M8 `YMMMa.',
  'MM    ,dP\' YM.       MM    MM    MM YA.   ,A9 .    I8',
  'MMmmmdP\'    `Mbmmd\'  MM    MM    MM  `Ybmd9\'  M9mmmP\''
];

// Grid configuration
const GRID_WIDTH = 80;  // cols
const GRID_HEIGHT = 10; // rows
const TICK_RATE = 200;  // ms
const TYPE1_SPAWN_CHANCE = 0.04;
const MAX_TYPE1_CHARS = 20;

// 🔥 Initial high-energy spawn configuration
const INITIAL_SPAWN_COUNT = 12;
const INITIAL_SPAWN_DURATION = 2000;
const INITIAL_SPAWN_CHANCE = 0.20;

// ASCII characters
const TYPE2_CHAR = '@';
const EMPTY_CHAR = ' ';

// 🎨 Colors
const GHOST_COLORS = ['#778BEB', '#FFB347', '#9370DB', '#000000'];
const CHASER_COLOR = '#FF5E5B';
const CHASER_FONT_WEIGHT = 'bold';

// CSS styles
const styles = {
  container: {
    fontFamily: '"JetBrains Mono", monospace',
    backgroundColor: 'var(--background-color)',
    color: 'var(--text-color)',
    display: 'flex',
    justifyContent: 'center',
    margin: 0,
    padding: 0
  },  
  grid: {
    position: 'relative',
    width: `${GRID_WIDTH}ch`,
    height: `calc(${GRID_HEIGHT} * var(--line-height, 1.20rem))`,
    overflow: 'hidden',
    whiteSpace: 'pre',
    fontVariantNumeric: 'tabular-nums lining-nums'
  },
  debugOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
    backgroundImage: `
      repeating-linear-gradient(rgba(0,0,0,0.1) 0 1px, transparent 1px 100%),
      repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0 1px, transparent 1px 100%)
    `,
    backgroundSize: '1ch var(--line-height)',
    zIndex: 1
  },
  content: { position: 'relative', zIndex: 2, margin: 0 }
};

const GridAnimation = () => {
  const gridRef = useRef(null);

  // --- Helpers ---------------------------------------------------------------
  const asciiWidth = useRef(Math.max(...DEMOS_ASCII.map(l => l.trimEnd().length))); // ≈ 50
  const [startX, setStartX] = useState(0);

  const measureCharWidthPx = (containerEl) => {
    // Create a hidden ruler element sized to 1ch within the same font context
    const span = document.createElement('span');
    span.textContent = '0';
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = 'inherit';
    span.style.width = '1ch';
    containerEl.appendChild(span);
    const width = span.getBoundingClientRect().width;
    containerEl.removeChild(span);
    return width || 8; // fallback
  };

  const computeStartX = (containerEl) => {
    if (!containerEl) return 0;
    const chPx = measureCharWidthPx(containerEl);
    // How many character columns are ACTUALLY visible in the grid box?
    const visibleCols = Math.max(1, Math.min(GRID_WIDTH, Math.floor(containerEl.clientWidth / chPx)));

    // Center within the visible window (not the full 80 if it's clipped)
    let x = Math.floor((visibleCols - asciiWidth.current) / 2);

    if (!CENTER_ASCII) {
      x = HORIZONTAL_PADDING;
    }

    // Apply padding and clamp to grid bounds
    const minX = Math.max(0, HORIZONTAL_PADDING);
    const maxX = Math.max(0, GRID_WIDTH - asciiWidth.current - HORIZONTAL_PADDING);
    x = Math.max(minX, Math.min(x, maxX));

    // Final safety clamp to grid
    x = Math.max(0, Math.min(x, GRID_WIDTH - asciiWidth.current));
    return x;
  };

  // Build background grid for a given startX
  const createBackgroundGrid = (xStart) => {
    const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(EMPTY_CHAR));
    const startY = Math.floor((GRID_HEIGHT - DEMOS_ASCII.length) / 2);

    DEMOS_ASCII.forEach((line, y) => {
      const trimmedLine = line.trimEnd();
      const gridY = startY + y;
      if (gridY < 0 || gridY >= GRID_HEIGHT) return;
      for (let x = 0; x < trimmedLine.length; x++) {
        const gridX = xStart + x;
        if (gridX >= 0 && gridX < GRID_WIDTH) {
          grid[gridY][gridX] = trimmedLine[x];
        }
      }
    });
    return grid;
  };

  // Find all letter positions
  const findLetterPositions = (grid) => {
    const arr = [];
    const re = /[a-zA-Z]/;
    grid.forEach((row, y) => {
      row.forEach((ch, x) => { if (re.test(ch)) arr.push({ x, y, char: ch }); });
    });
    return arr;
  };

  // --- State that depends on startX/background ------------------------------
  const [backgroundGrid, setBackgroundGrid] = useState(() => createBackgroundGrid(0));
  const letterPositions = useRef(findLetterPositions(backgroundGrid));
  useEffect(() => {
    setBackgroundGrid(createBackgroundGrid(startX));
  }, [startX]);
  useEffect(() => {
    letterPositions.current = findLetterPositions(backgroundGrid);
  }, [backgroundGrid]);

  // --- Measure & react to resize --------------------------------------------
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const apply = () => setStartX(computeStartX(el));
    apply();

    const ro = new ResizeObserver(() => apply());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Animation state & logic (unchanged from your version) -----------------
  const [type1Chars, setType1Chars] = useState([]);
  const [type2Char, setType2Char] = useState(null);
  const [eatenCount, setEatenCount] = useState(0);
  const [isInitialSpawnPeriod, setIsInitialSpawnPeriod] = useState(true);
  const initialSpawnTimeRef = useRef(Date.now());
  const tickRef = useRef(null);

  useEffect(() => {
    const initialX = Math.floor(Math.random() * GRID_WIDTH);
    const initialY = Math.floor(Math.random() * GRID_HEIGHT);
    setType2Char({ x: initialX, y: initialY, vx: Math.random() > 0.5 ? 1 : -1, vy: 0, lastMove: Date.now() });

    for (let i = 0; i < INITIAL_SPAWN_COUNT; i++) setTimeout(() => spawnType1(), i * 50);

    const timer = setTimeout(() => setIsInitialSpawnPeriod(false), INITIAL_SPAWN_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const getRandomDirection = () => {
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };
  const getPerpendicularDirection = (vx, vy) => (vx !== 0 ? [0, Math.random() > 0.5 ? 1 : -1] : [Math.random() > 0.5 ? 1 : -1, 0]);

  const spawnType1 = () => {
    if (type1Chars.length >= MAX_TYPE1_CHARS || letterPositions.current.length === 0) return;
    const sourcePos = letterPositions.current[Math.floor(Math.random() * letterPositions.current.length)];
    const [vx, vy] = getRandomDirection();
    const color = GHOST_COLORS[Math.floor(Math.random() * GHOST_COLORS.length)];
    setType1Chars(prev => [...prev, {
      id: Date.now() + Math.random(),
      x: sourcePos.x, y: sourcePos.y, char: sourcePos.char,
      color, vx, vy, speed: 1 + Math.random() * 0.5,
      velocityDecay: 0.95 + Math.random() * 0.04,
      lastMove: Date.now(),
      movesSinceDirectionChange: 0,
      movesBeforeDirectionChange: 2 + Math.floor(Math.random() * 3)
    }]);
  };

  const updateCharacters = () => {
    const now = Date.now();
    setType1Chars(prev => prev.map(char => {
      const timeSinceMove = now - char.lastMove;
      const moveInterval = TICK_RATE / char.speed;
      if (timeSinceMove < moveInterval) return char;

      const newSpeed = char.speed * char.velocityDecay;
      if (newSpeed < 0.1) return { ...char, vx: 0, vy: 0, speed: 0 };

      let newVx = char.vx, newVy = char.vy;
      let movesSince = char.movesSinceDirectionChange + 1;
      let movesBefore = char.movesBeforeDirectionChange;

      if (movesSince >= movesBefore) {
        [newVx, newVy] = getPerpendicularDirection(char.vx, char.vy);
        movesSince = 0;
        movesBefore = 2 + Math.floor(Math.random() * 3);
      }

      let newX = char.x + newVx;
      let newY = char.y + newVy;

      if (newX < 0 || newX >= GRID_WIDTH) {
        newVx = -newVx;
        newX = Math.max(0, Math.min(GRID_WIDTH - 1, newX));
        [newVx, newVy] = getPerpendicularDirection(newVx, newVy);
        movesSince = 0;
      }
      if (newY < 0 || newY >= GRID_HEIGHT) {
        newVy = -newVy;
        newY = Math.max(0, Math.min(GRID_HEIGHT - 1, newY));
        [newVx, newVy] = getPerpendicularDirection(newVx, newVy);
        movesSince = 0;
      }

      return { ...char, x: newX, y: newY, vx: newVx, vy: newVy, speed: newSpeed, lastMove: now, movesSinceDirectionChange: movesSince, movesBeforeDirectionChange: movesBefore };
    }));

    setType2Char(prev => {
      if (!prev) return null;
      const timeSinceMove = now - prev.lastMove;
      if (timeSinceMove < TICK_RATE * 0.5) return prev;

      let target = null, minDist = Infinity;
      type1Chars.forEach(char => {
        const d = Math.abs(char.x - prev.x) + Math.abs(char.y - prev.y);
        if (d < minDist) { minDist = d; target = char; }
      });

      let newX = prev.x, newY = prev.y, newVx = prev.vx, newVy = prev.vy;
      if (target) {
        const dx = target.x - prev.x, dy = target.y - prev.y;
        if (Math.abs(dx) > Math.abs(dy)) { newVx = Math.sign(dx); newVy = 0; }
        else if (dy !== 0) { newVx = 0; newVy = Math.sign(dy); }
      } else if (Math.random() > 0.8) {
        [newVx, newVy] = getRandomDirection();
      }

      newX = Math.max(0, Math.min(GRID_WIDTH - 1, newX + newVx));
      newY = Math.max(0, Math.min(GRID_HEIGHT - 1, newY + newVy));
      return { ...prev, x: newX, y: newY, vx: newVx, vy: newVy, lastMove: now };
    });

    if (type2Char) {
      setType1Chars(prev => {
        const remaining = prev.filter(c => !(c.x === type2Char.x && c.y === type2Char.y));
        const eaten = prev.length - remaining.length;
        if (eaten > 0) setEatenCount(cnt => cnt + eaten);
        return remaining;
      });
    }

    const spawnChance = isInitialSpawnPeriod ? INITIAL_SPAWN_CHANCE : TYPE1_SPAWN_CHANCE;
    if (type1Chars.length === 0 || Math.random() < spawnChance) spawnType1();
  };

  const renderGrid = () => {
    const displayGrid = backgroundGrid.map(row => [...row]);
    const colored = new Map();

    type1Chars.forEach(char => {
      if (char.y >= 0 && char.y < GRID_HEIGHT && char.x >= 0 && char.x < GRID_WIDTH) {
        displayGrid[char.y][char.x] = char.char;
        colored.set(`${char.y}-${char.x}`, { char: char.char, color: char.color });
      }
    });

    if (type2Char && type2Char.y >= 0 && type2Char.y < GRID_HEIGHT && type2Char.x >= 0 && type2Char.x < GRID_WIDTH) {
      displayGrid[type2Char.y][type2Char.x] = TYPE2_CHAR;
      colored.set(`${type2Char.y}-${type2Char.x}`, { char: TYPE2_CHAR, color: CHASER_COLOR, fontWeight: CHASER_FONT_WEIGHT });
    }

    return displayGrid.map((row, y) => {
      const rowEls = [];
      let buf = '';
      for (let x = 0; x < row.length; x++) {
        const key = `${y}-${x}`;
        const meta = colored.get(key);
        if (meta) {
          if (buf) { rowEls.push(buf); buf = ''; }
          rowEls.push(
            <span key={key} style={{ color: meta.color, fontWeight: meta.fontWeight || 'normal' }}>
              {meta.char}
            </span>
          );
        } else {
          buf += row[x];
        }
      }
      if (buf) rowEls.push(buf);
      return <div key={y} style={{ margin: 0, padding: 0, height: 'var(--line-height)' }}>{rowEls}</div>;
    });
  };

  useEffect(() => {
    tickRef.current = setInterval(updateCharacters, 50);
    return () => clearInterval(tickRef.current);
  }, [type1Chars, type2Char, isInitialSpawnPeriod, backgroundGrid]);

  return (
    <div className="ascii-banner" style={{ ...styles.container, justifyContent: 'center' }}>
      <div ref={gridRef} style={styles.grid}>
        {SHOW_GRID && <div style={styles.debugOverlay} />}
        <div style={styles.content}>{renderGrid()}</div>
      </div>
    </div>
  );
};

export default GridAnimation;
