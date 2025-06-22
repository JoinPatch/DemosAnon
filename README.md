# DEMOS - ASCII Art with Monospace Grid

A modern web implementation of ASCII art using a monospace grid system inspired by Oskar Wickström's "The Monospace Web".

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

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
