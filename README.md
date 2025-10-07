# DEMOS - ASCII Art with Monospace Grid

A modern web implementation of ASCII art using a monospace grid system inspired by Oskar Wickström's "The Monospace Web".

---

## Adding a New Session

To add a new DemosAnon session:

1. **Update the session list**  
   Open `src/data/sessions.md` and add a new entry at the top (newest first).  
   Follow the existing format:  
   ```
   ## Session 42
   - [Name](https://link) description of what they demoed or discussed
   ```
   You can use markdown links and bullets just like other sessions.

2. **Add session images**  
   Create a new folder for the session inside `src/data/sessions/` and add your images there.  
   Example:
   ```
   src/data/sessions/
   ├── session42/
   │   ├── image1.jpg
   │   ├── image2.jpg
   │   └── image3.jpg
   ```
 
## Features

- **Monospace Grid System**: Every glyph sits flush inside an invisible 1ch × var(--line-height) grid
- **Debug Overlay**: Toggle-able grid overlay for development
- **Responsive Design**: Works across all screen sizes
- **Dark Mode Support**: Automatic dark/light mode switching
- **JetBrains Mono Font**: Professional monospace typography

## Grid System

The monospace grid is controlled by CSS custom properties in `src/styles/monospace-grid.css`:

```css
:root {
  --font-family: 'JetBrains Mono', monospace;
  --line-height: 1.2rem;        /* one row of the grid */
  --cell-width : 1ch;           /* one column of the grid */
  --border     : 2px;           /* shared "ink" thickness */
  --fg         : #000;
  --bg         : #fff;
}
```

## Development

### Running the Project

```bash
npm run dev
```

The development server will start at `http://localhost:4321`

### Debug Grid

In development mode, the debug grid overlay is automatically enabled. You can toggle it by:

1. Opening browser dev tools
2. Adding/removing the `debug` class on the `<body>` element
3. Or running `document.body.classList.toggle('debug')` in the console

### Grid Alignment

The system automatically:
- Fits images and videos so their bottom edge lands on a grid row
- Flags elements that start off-grid with a red background
- Uses the h/2 trick for baseline alignment (text appears centered between grid lines)

## Project Structure

```
src/
├── components/
│   └── ASCIIHeader.jsx      # Simplified ASCII art component
├── layouts/
│   └── Layout.astro         # Main layout with grid system
├── pages/
│   └── index.astro          # Home page
├── styles/
│   └── monospace-grid.css   # Global grid styles
└── utils/
    └── monospaceGrid.js     # Grid helper functions
```

## Extending the Grid

The monospace grid system is designed to be extensible. When you add new content:

- **Text**: Automatically aligns to the grid
- **Images/Video**: Automatically adjusted to fit grid rows
- **Tables**: Built-in support for table elements
- **Forms**: Can be styled to respect the grid
- **Animations**: Can be timed to grid intervals

## Credits

Inspired by [The Monospace Web](https://owickstrom.github.io/the-monospace-web/) by Oskar Wickström.

## License

MIT