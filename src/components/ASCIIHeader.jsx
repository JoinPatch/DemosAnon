import React, { useState, useEffect, useRef } from 'react';

console.log("made by tim: https://timfarrelly.com");
console.log("code: https://github.com/timf34/DemosAnon");

// Configuration flag - set to false to hide the grid
const SHOW_GRID = false;

// 📌 New configuration for centering and padding
const CENTER_ASCII = true; // Set to true to center the DEMOS text
// TODO: I don't think the horizontal padding does anything for a large grid width
const HORIZONTAL_PADDING = 10; // Characters of padding on each side

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

// Grid configuration - adjusted width to fit ASCII art
const GRID_WIDTH = 80; // Increased to accommodate "Demos" text
const GRID_HEIGHT = 10; // cells
const TICK_RATE = 200; // ms between updates
const TYPE1_SPAWN_CHANCE = 0.04; // ⚡ Increased to 4% chance per tick (after initial burst)
const MAX_TYPE1_CHARS = 20; // ⚡ Increased maximum Type 1 characters

// 🔥 Initial high-energy spawn configuration
const INITIAL_SPAWN_COUNT = 12; // ⚡ Increased number of ghosts to spawn immediately
const INITIAL_SPAWN_DURATION = 2000; // Duration of high spawn rate in ms
const INITIAL_SPAWN_CHANCE = 0.20; // ⚡ Increased to 20% chance during initial burst

// ASCII characters for entities
const TYPE2_CHAR = '@'; // Changed from ◉ to @
const EMPTY_CHAR = ' ';

// 🎨 Color configuration for ghost characters
const GHOST_COLORS = [
  '#778BEB',  // Cyan
  '#FFB347',  // Yellow/Gold
  '#9370DB',  // Purple
  '#000000',  // Black (for contrast)
];

// 🎨 Chaser character styling
const CHASER_COLOR = '#FF5E5B'; // Bold black
const CHASER_FONT_WEIGHT = 'bold';

// CSS styles for horizontally centered grid
const styles = {
  container: {
    fontFamily: '"JetBrains Mono", monospace',
    backgroundColor: '#fff',
    color: '#000',
    display: 'flex',
    justifyContent: 'center',
    margin: 0,
    padding: 0,
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: '#000',
      color: '#fff',
    }
  },
  grid: {
    position: 'relative',
    width: `${GRID_WIDTH}ch`,
    height: `calc(${GRID_HEIGHT} * var(--line-height, 1.20rem))`,
    overflow: 'hidden',
    whiteSpace: 'pre',
    fontVariantNumeric: 'tabular-nums lining-nums',
    '--line-height': '1.20rem'
  },
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    backgroundImage: `
      repeating-linear-gradient(rgba(0,0,0,0.1) 0 1px, transparent 1px 100%),
      repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0 1px, transparent 1px 100%)
    `,
    backgroundSize: '1ch var(--line-height)',
    zIndex: 1
  },
  content: {
    position: 'relative',
    zIndex: 2,
    margin: 0
  }
};

const GridAnimation = () => {
  // Initialize background grid with "Demos" ASCII art
  const createBackgroundGrid = () => {
    const grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(EMPTY_CHAR));
    
    // Center the ASCII art vertically
    const startY = Math.floor((GRID_HEIGHT - DEMOS_ASCII.length) / 2);
    
    // 🎯 Calculate horizontal positioning with optional centering and padding
    let startX = 0;
    const maxLineLength = Math.max(...DEMOS_ASCII.map(line => line.trimEnd().length));
    
    if (CENTER_ASCII) {
      // Center the text horizontally with padding
      startX = Math.floor((GRID_WIDTH - maxLineLength) / 2);
      // Apply additional padding if specified
      startX = Math.max(HORIZONTAL_PADDING, startX);
    } else {
      // Just apply padding from the left
      startX = HORIZONTAL_PADDING;
    }
    
    // Place ASCII art in grid
    DEMOS_ASCII.forEach((line, y) => {
      const gridY = startY + y;
      if (gridY >= 0 && gridY < GRID_HEIGHT) {
        const trimmedLine = line.trimEnd(); // Remove trailing spaces for proper centering
        for (let x = 0; x < trimmedLine.length; x++) {
          const gridX = startX + x;
          if (gridX >= 0 && gridX < GRID_WIDTH) {
            grid[gridY][gridX] = trimmedLine[x];
          }
        }
      }
    });
    
    return grid;
  };

  // Find all letter positions in the background grid (not spaces or special chars)
  const findLetterPositions = (grid) => {
    const positions = [];
    const letterRegex = /[a-zA-Z]/; // Only match actual letters 
    
    grid.forEach((row, y) => {
      row.forEach((char, x) => {
        if (letterRegex.test(char)) {
          positions.push({ x, y, char });
        }
      });
    });
    
    return positions;
  };

  // State management
  const backgroundGrid = useRef(createBackgroundGrid());
  const letterPositions = useRef(findLetterPositions(backgroundGrid.current));
  const [type1Chars, setType1Chars] = useState([]);
  const [type2Char, setType2Char] = useState(null);
  const [eatenCount, setEatenCount] = useState(0);
  const tickRef = useRef(null);
  
  // 🔥 State for initial high-energy spawn period
  const [isInitialSpawnPeriod, setIsInitialSpawnPeriod] = useState(true);
  const initialSpawnTimeRef = useRef(Date.now());

  // Initialize Type 2 character at start
  useEffect(() => {
    const initialX = Math.floor(Math.random() * GRID_WIDTH);
    const initialY = Math.floor(Math.random() * GRID_HEIGHT);
    setType2Char({
      x: initialX,
      y: initialY,
      vx: Math.random() > 0.5 ? 1 : -1,
      vy: 0,
      lastMove: Date.now()
    });
    
    // 🔥 Spawn initial burst of ghost characters
    for (let i = 0; i < INITIAL_SPAWN_COUNT; i++) {
      setTimeout(() => spawnType1(), i * 50); // Stagger spawns slightly for visual effect
    }
    
    // 🔥 End initial spawn period after duration
    const timer = setTimeout(() => {
      setIsInitialSpawnPeriod(false);
    }, INITIAL_SPAWN_DURATION);
    
    return () => clearTimeout(timer);
  }, []);

  // Generate random direction (horizontal or vertical only)
  const getRandomDirection = () => {
    // 🕹️ Only cardinal directions - one axis at a time
    const dirs = [
      [1, 0],   // right
      [-1, 0],  // left
      [0, 1],   // down
      [0, -1],  // up
    ];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };

  // 🕹️ Get a perpendicular direction for zigzag movement
  const getPerpendicularDirection = (vx, vy) => {
    if (vx !== 0) {
      // Currently moving horizontally, switch to vertical
      return [0, Math.random() > 0.5 ? 1 : -1];
    } else {
      // Currently moving vertically, switch to horizontal
      return [Math.random() > 0.5 ? 1 : -1, 0];
    }
  };

  // Spawn new Type 1 character (ghost letter from "Demos" text)
  const spawnType1 = () => {
    if (type1Chars.length >= MAX_TYPE1_CHARS || letterPositions.current.length === 0) return;
    
    // Pick a random letter position from the "Demos" text
    const sourcePos = letterPositions.current[Math.floor(Math.random() * letterPositions.current.length)];
    const [vx, vy] = getRandomDirection();
    
    // 🎨 Randomly assign a color to the ghost
    const color = GHOST_COLORS[Math.floor(Math.random() * GHOST_COLORS.length)];
    
    // Create ghost character that copies the letter from source position
    setType1Chars(prev => [...prev, {
      id: Date.now() + Math.random(),
      x: sourcePos.x,
      y: sourcePos.y,
      char: sourcePos.char, // Ghost copies the letter from its spawn position
      color: color, // 🎨 Assigned color
      vx, vy,
      speed: 1 + Math.random() * 0.5, // Variable speed
      velocityDecay: 0.95 + Math.random() * 0.04, // How fast it slows down
      lastMove: Date.now(),
      movesSinceDirectionChange: 0, // 🕹️ Track moves for zigzag behavior
      movesBeforeDirectionChange: 2 + Math.floor(Math.random() * 3) // 🕹️ Change direction every 2-4 moves
    }]);
  };

  // Update character positions
  const updateCharacters = () => {
    const now = Date.now();

    // Update Type 1 characters (ghost letters)
    setType1Chars(prev => prev.map(char => {
      const timeSinceMove = now - char.lastMove;
      const moveInterval = TICK_RATE / char.speed;
      
      if (timeSinceMove < moveInterval) return char;

      // Apply velocity decay
      const newSpeed = char.speed * char.velocityDecay;
      
      // Stop if too slow
      if (newSpeed < 0.1) {
        return { ...char, vx: 0, vy: 0, speed: 0 };
      }

      // 🕹️ Check if it's time to change direction for zigzag movement
      let newVx = char.vx;
      let newVy = char.vy;
      let movesSinceDirectionChange = char.movesSinceDirectionChange + 1;
      let movesBeforeDirectionChange = char.movesBeforeDirectionChange;
      
      // Change direction after specified number of moves
      if (movesSinceDirectionChange >= movesBeforeDirectionChange) {
        // Switch to perpendicular direction
        [newVx, newVy] = getPerpendicularDirection(char.vx, char.vy);
        movesSinceDirectionChange = 0;
        movesBeforeDirectionChange = 2 + Math.floor(Math.random() * 3); // Next change in 2-4 moves
      }

      // Calculate new position
      let newX = char.x + newVx;
      let newY = char.y + newVy;

      // Bounce off walls and change direction
      if (newX < 0 || newX >= GRID_WIDTH) {
        newVx = -newVx;
        newX = Math.max(0, Math.min(GRID_WIDTH - 1, newX));
        // 🕹️ Switch to perpendicular movement on wall hit
        [newVx, newVy] = getPerpendicularDirection(newVx, newVy);
        movesSinceDirectionChange = 0;
      }
      if (newY < 0 || newY >= GRID_HEIGHT) {
        newVy = -newVy;
        newY = Math.max(0, Math.min(GRID_HEIGHT - 1, newY));
        // 🕹️ Switch to perpendicular movement on wall hit
        [newVx, newVy] = getPerpendicularDirection(newVx, newVy);
        movesSinceDirectionChange = 0;
      }

      return {
        ...char,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        speed: newSpeed,
        lastMove: now,
        movesSinceDirectionChange,
        movesBeforeDirectionChange
      };
    }));

    // Update Type 2 character (@ chaser)
    setType2Char(prev => {
      if (!prev) return null;
      
      const timeSinceMove = now - prev.lastMove;
      if (timeSinceMove < TICK_RATE * 0.5) return prev; // ⚡ Much faster - moves at 2x speed

      // Find nearest Type 1 character
      let target = null;
      let minDist = Infinity;
      
      type1Chars.forEach(char => {
        const dist = Math.abs(char.x - prev.x) + Math.abs(char.y - prev.y);
        if (dist < minDist) {
          minDist = dist;
          target = char;
        }
      });

      let newX = prev.x;
      let newY = prev.y;
      let newVx = prev.vx;
      let newVy = prev.vy;

      if (target) {
        // Chase logic - move towards target
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        
        // Prioritize the axis with greater distance
        if (Math.abs(dx) > Math.abs(dy)) {
          newVx = Math.sign(dx);
          newVy = 0;
        } else if (dy !== 0) {
          newVx = 0;
          newVy = Math.sign(dy);
        }
      } else {
        // Random movement if no targets
        if (Math.random() > 0.8) {
          const [vx, vy] = getRandomDirection();
          newVx = vx;
          newVy = vy;
        }
      }

      // Move
      newX += newVx;
      newY += newVy;

      // Keep in bounds
      newX = Math.max(0, Math.min(GRID_WIDTH - 1, newX));
      newY = Math.max(0, Math.min(GRID_HEIGHT - 1, newY));

      return {
        ...prev,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        lastMove: now
      };
    });

    // Check for collisions (Type 2 eating Type 1)
    if (type2Char) {
      setType1Chars(prev => {
        const remaining = prev.filter(char => 
          !(char.x === type2Char.x && char.y === type2Char.y)
        );
        const eaten = prev.length - remaining.length;
        if (eaten > 0) {
          setEatenCount(count => count + eaten);
        }
        return remaining;
      });
    }

    // Randomly spawn new Type 1 characters (ghost letters)
    // 🔥 Use higher spawn chance during initial period
    const currentSpawnChance = isInitialSpawnPeriod ? INITIAL_SPAWN_CHANCE : TYPE1_SPAWN_CHANCE;
    
    // ⚡ Ensure at least one ghost is always visible
    if (type1Chars.length === 0 || Math.random() < currentSpawnChance) {
      spawnType1();
    }
  };

  // Render grid with background and moving characters
  const renderGrid = () => {
    // Start with background grid (copy it to avoid mutation)
    const displayGrid = backgroundGrid.current.map(row => [...row]);
    
    // 🎨 Track colored characters and their positions for rendering
    const coloredChars = new Map(); // key: "y-x", value: {char, color}
    
    // Overlay Type 1 characters (ghost letters) with their colors
    type1Chars.forEach(char => {
      if (char.y >= 0 && char.y < GRID_HEIGHT && 
          char.x >= 0 && char.x < GRID_WIDTH) {
        displayGrid[char.y][char.x] = char.char; // Use the ghost's letter
        coloredChars.set(`${char.y}-${char.x}`, {
          char: char.char,
          color: char.color
        });
      }
    });
    
    // Overlay Type 2 character (@ symbol) - overwrites anything underneath
    if (type2Char && 
        type2Char.y >= 0 && type2Char.y < GRID_HEIGHT && 
        type2Char.x >= 0 && type2Char.x < GRID_WIDTH) {
      displayGrid[type2Char.y][type2Char.x] = TYPE2_CHAR;
      // 🎨 Mark chaser position for special styling
      coloredChars.set(`${type2Char.y}-${type2Char.x}`, {
        char: TYPE2_CHAR,
        color: CHASER_COLOR,
        fontWeight: CHASER_FONT_WEIGHT
      });
    }
    
    // 🎨 Convert to JSX with colored spans
    return displayGrid.map((row, y) => {
      const rowElements = [];
      let currentText = '';
      
      for (let x = 0; x < row.length; x++) {
        const key = `${y}-${x}`;
        const coloredChar = coloredChars.get(key);
        
        if (coloredChar) {
          // Push any accumulated plain text
          if (currentText) {
            rowElements.push(currentText);
            currentText = '';
          }
          // Push colored character
          rowElements.push(
            <span 
              key={key} 
              style={{ 
                color: coloredChar.color,
                fontWeight: coloredChar.fontWeight || 'normal'
              }}
            >
              {coloredChar.char}
            </span>
          );
        } else {
          // Accumulate plain text
          currentText += row[x];
        }
      }
      
      // Push any remaining plain text
      if (currentText) {
        rowElements.push(currentText);
      }
      
      return (
        <div key={y} style={{ margin: 0, padding: 0, height: 'var(--line-height)' }}>
          {rowElements}
        </div>
      );
    });
  };

  // Animation loop
  useEffect(() => {
    tickRef.current = setInterval(updateCharacters, 50);
    
    return () => clearInterval(tickRef.current);
  }, [type1Chars, type2Char, isInitialSpawnPeriod]);

  return (
    <div className="ascii-banner" style={styles.container}>
      <div style={styles.grid}>
        {SHOW_GRID && <div style={styles.debugOverlay} />}
        <div style={styles.content}>{renderGrid()}</div>
      </div>
    </div>
  );
};

export default GridAnimation;