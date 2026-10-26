import React, { useEffect, useRef, useState } from "react";
import { DEMOS_ASCII, GRID_WIDTH, GRID_HEIGHT, GHOST_COLORS } from "./ASCIIHeader.jsx";

// Halloween take on the DEMOS header. Coloured letters still spill out of
// DEMOS and wander about as in the normal header, but instead of the @ there's
// a ghost. It slips out of one of the letters' vertical bars (half out it
// looks like "c|"), drifts slowly after the coloured letters while they run
// away, then slips back into a bar and stays in the ether for a while.

const HORIZONTAL_PADDING = 2;
const TICK_MS = 50;
const MOVE_MS = 200; // a coloured letter at speed 1 moves one cell this often
const SPAWN_CHANCE = 0.04; // per tick, once the opening burst is out
const MAX_LETTERS = 20;
const INITIAL_SPAWN_COUNT = 12;
const ETHER_MS = [2000, 5000]; // hidden between appearances
const HAUNT_MS = [7000, 11000]; // out and chasing
const FLEE_RADIUS = 9; // letters run when the ghost is this close (cols; rows count double)
const FLEE_SPEED = 1.8;
const GHOST_COLOR = "var(--text-color-alt)";

// As drawn the ghost moves left with its tail trailing to the right; it's
// mirrored when it moves right. Spaces inside each row's outline are drawn
// too, so the ghost hides whatever it floats over; spaces outside it are
// see-through.
// Its hands point the way it's going. Mostly it drifts along tired (- . -),
// with the odd fast spook dash (o O o).
const MOODS = {
	tired: { eyes: "- -", mouth: ".", stepMs: 450 },
	spook: { eyes: "o o", mouth: "O", stepMs: 100 },
};
const ghostLeft = ({ eyes, mouth }) => [" .-.", `|${eyes}|`, `< ${mouth} <`, " \\   \\", "  `~~~'"];
const GW = Math.max(...ghostLeft(MOODS.tired).map((r) => r.length));
const GH = ghostLeft(MOODS.tired).length;
const MIRROR = { "/": "\\", "\\": "/", "(": ")", ")": "(", "<": ">", ">": "<", "`": "'", "'": "`" };
const mirror = (rows) => rows.map((r) => [...r.padEnd(GW)].reverse().map((c) => MIRROR[c] || c).join("").trimEnd());
const GHOST = Object.fromEntries(
	Object.entries(MOODS).map(([k, m]) => [k, { left: ghostLeft(m), right: mirror(ghostLeft(m)) }])
);

const ART = DEMOS_ASCII.map((l) => l.trimEnd());
const ART_WIDTH = Math.max(...ART.map((l) => l.length));

// Vertical bars the ghost passes through, in art coordinates: both sides of
// D's stem and the m's outer stems. `side` is the side of the bar the ghost is
// visible on.
const PORTALS = [
	{ x: 0, top: 0, bottom: 6, side: -1 },
	{ x: 1, top: 0, bottom: 6, side: 1 },
	{ x: 21, top: 2, bottom: 6, side: -1 },
	{ x: 34, top: 2, bottom: 6, side: 1 },
];

const DIRS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
];

const rand = ([lo, hi]) => lo + Math.random() * (hi - lo);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const perpendicular = ([vx]) => (vx !== 0 ? [0, Math.random() > 0.5 ? 1 : -1] : [Math.random() > 0.5 ? 1 : -1, 0]);

const styles = {
	container: {
		fontFamily: '"JetBrains Mono", monospace',
		backgroundColor: "var(--background-color)",
		color: "var(--text-color)",
		display: "flex",
		justifyContent: "center",
		margin: 0,
		padding: 0,
	},
	grid: {
		position: "relative",
		width: `${GRID_WIDTH}ch`,
		height: `calc(${GRID_HEIGHT} * var(--line-height, 1.20rem))`,
		overflow: "hidden",
		whiteSpace: "pre",
		fontVariantNumeric: "tabular-nums lining-nums",
	},
	row: { margin: 0, padding: 0, height: "var(--line-height)" },
	// JetBrains Mono would otherwise join pairs like "|-" into arrows.
	ghost: {
		color: GHOST_COLOR,
		fontVariantLigatures: "none",
		fontFeatureSettings: '"liga" 0, "calt" 0',
	},
};

const newSim = () => ({
	startX: 0,
	startY: Math.floor((GRID_HEIGHT - ART.length) / 2),
	cols: GRID_WIDTH,
	letters: [],
	toSpawn: INITIAL_SPAWN_COUNT,
	ghost: { phase: "ether", until: 0, x: 0, y: 0 },
	lastGhostStep: 0,
});

// Where a portal's bar is in the grid, and the row the ghost lines up on to
// fit inside it.
const portalAt = (s, p) => ({
	px: s.startX + p.x,
	y: s.startY + p.top + Math.floor((p.bottom - p.top + 1 - GH) / 2),
});

// Only bars with room for the ghost on its side, inside the visible grid.
const usablePortals = (s) =>
	PORTALS.filter((p) => {
		const { px } = portalAt(s, p);
		return p.side < 0 ? px >= 2 : px <= s.cols - 3;
	});

// The columns of the ghost that are out of the bar, or null while it's hidden.
const ghostSpan = (s) => {
	const g = s.ghost;
	if (g.phase === "ether") return null;
	let x0 = g.x;
	let x1 = g.x + GW - 1;
	if (g.phase === "emerging" || (g.phase === "entering" && g.inBar)) {
		const { px } = portalAt(s, g.portal);
		if (g.portal.side < 0) x1 = Math.min(x1, px - 1);
		else x0 = Math.max(x0, px + 1);
	}
	return x1 >= x0 ? { x0, x1 } : null;
};

const spawnLetter = (s, now) => {
	if (s.letters.length >= MAX_LETTERS) return;
	const sources = [];
	ART.forEach((line, y) => {
		for (let x = 0; x < line.length; x++)
			if (/[a-zA-Z]/.test(line[x])) sources.push({ x: s.startX + x, y: s.startY + y, ch: line[x] });
	});
	const src = pick(sources);
	const [vx, vy] = pick(DIRS);
	s.letters.push({
		...src,
		color: pick(GHOST_COLORS),
		vx,
		vy,
		speed: 1 + Math.random() * 0.5,
		decay: 0.95 + Math.random() * 0.04,
		lastMove: now,
		moves: 0,
		turnAfter: 2 + Math.floor(Math.random() * 3),
	});
};

// Coloured letters wander and slow down as in the normal header; with the
// ghost close by they bolt straight away from it instead.
const stepLetters = (s, now) => {
	const span = ghostSpan(s);
	const gc = span && (span.x0 + span.x1) / 2;
	const gr = s.ghost.y + (GH - 1) / 2;
	const inGrid = (x, y) => x >= 0 && x < s.cols && y >= 0 && y < GRID_HEIGHT;

	for (const L of s.letters) {
		const dx = span ? L.x - gc : Infinity;
		const dy = (L.y - gr) * 2;
		const fleeing = span && Math.abs(dx) + Math.abs(dy) < FLEE_RADIUS;
		if (fleeing) {
			// Straight away along whichever axis puts more distance between them,
			// sliding along the edge if that way is blocked.
			const away = [
				[Math.sign(dx) || 1, 0],
				[0, Math.sign(dy) || 1],
			];
			if (Math.abs(dy) > Math.abs(dx)) away.reverse();
			const options = [...away, ...away.map(([x, y]) => [y, x]), ...away.map(([x, y]) => [-y, -x])];
			[L.vx, L.vy] = options.find(([x, y]) => inGrid(L.x + x, L.y + y)) || [0, 0];
			L.speed = Math.max(L.speed, FLEE_SPEED);
			L.moves = 0;
		}
		if (L.speed < 0.1 || now - L.lastMove < MOVE_MS / L.speed) continue;
		L.lastMove = now;
		if (!fleeing) {
			L.speed *= L.decay;
			if (++L.moves >= L.turnAfter) {
				[L.vx, L.vy] = perpendicular([L.vx, L.vy]);
				L.moves = 0;
				L.turnAfter = 2 + Math.floor(Math.random() * 3);
			}
		}
		let nx = L.x + L.vx;
		let ny = L.y + L.vy;
		if (!inGrid(nx, ny)) {
			[L.vx, L.vy] = perpendicular([L.vx, L.vy]);
			nx = clamp(L.x + L.vx, 0, s.cols - 1);
			ny = clamp(L.y + L.vy, 0, GRID_HEIGHT - 1);
		}
		L.x = nx;
		L.y = ny;
	}

	// Any the ghost does get to vanish into the ether with it.
	if (span)
		s.letters = s.letters.filter(
			(L) => !(L.x >= span.x0 && L.x <= span.x1 && L.y >= s.ghost.y && L.y < s.ghost.y + GH)
		);

	if (s.toSpawn > 0) {
		s.toSpawn--;
		spawnLetter(s, now);
	} else if (s.letters.length === 0 || Math.random() < SPAWN_CHANCE) spawnLetter(s, now);
};

const stepGhost = (s, now) => {
	const g = s.ghost;
	const { x, phase } = g;
	moveGhost(s, now);
	// Face the way it's going so the tail trails behind.
	if (phase !== "ether" && g.x !== x) g.facing = Math.sign(g.x - x);
};

const moveGhost = (s, now) => {
	const g = s.ghost;
	if (g.phase === "ether") {
		if (now < g.until) return;
		const portals = usablePortals(s);
		if (!portals.length) return;
		const p = pick(portals);
		const { px, y } = portalAt(s, p);
		// Start with all of it still inside the bar, facing the way it'll come out.
		Object.assign(g, { phase: "emerging", portal: p, facing: p.side, y, x: p.side < 0 ? px : px - GW + 1 });
		return;
	}

	if (g.phase === "emerging") {
		const { px } = portalAt(s, g.portal);
		g.x += g.portal.side;
		if (g.portal.side < 0 ? g.x + GW <= px : g.x > px) {
			g.phase = "haunting";
			g.until = now + rand(HAUNT_MS);
		}
		return;
	}

	const gc = g.x + (GW - 1) / 2;
	const gr = g.y + (GH - 1) / 2;

	if (g.phase === "haunting") {
		// Every so often decide whether to stay tired or do a short spook dash.
		if (!(now < g.moodUntil)) {
			g.mood = Math.random() < 0.3 ? "spook" : "tired";
			g.moodUntil = now + (g.mood === "spook" ? rand([800, 1500]) : rand([2500, 4500]));
		}
		if (now >= g.until) {
			g.mood = "tired";
			g.moodUntil = 0;
			// Head for the nearest bar on the side of it we're already on.
			const portals = usablePortals(s);
			const onSide = portals.filter((p) => Math.sign(gc - portalAt(s, p).px) === p.side);
			const pool = onSide.length ? onSide : portals;
			if (pool.length) {
				const dist = (p) => Math.abs(portalAt(s, p).px - gc);
				g.portal = pool.reduce((best, p) => (dist(p) < dist(best) ? p : best));
				g.phase = "entering";
				g.inBar = false;
				return;
			}
		}
		// Drift towards the nearest coloured letter, or wander if there are none.
		const near = s.letters.reduce(
			(best, L) => {
				const d = Math.abs(L.x - gc) + Math.abs(L.y - gr) * 2;
				return d < best.d ? { L, d } : best;
			},
			{ L: null, d: Infinity }
		).L;
		if (!near && (!g.wander || Math.random() < 0.05)) g.wander = pick(DIRS);
		const tx = near ? near.x : gc + g.wander[0];
		const ty = near ? near.y : gr + g.wander[1];
		g.x = clamp(g.x + Math.sign(Math.round(tx - gc)), 0, s.cols - GW);
		// Rows are much taller than columns are wide, so drift vertically at half speed.
		g.bob = !g.bob;
		if (g.bob) g.y = clamp(g.y + Math.sign(Math.round(ty - gr)), 0, GRID_HEIGHT - GH);
		return;
	}

	if (g.phase === "entering") {
		const { px, y } = portalAt(s, g.portal);
		const side = g.portal.side;
		if (!g.inBar) {
			const ax = side < 0 ? px - GW : px + 1; // just touching the bar
			g.x += Math.sign(ax - g.x);
			g.y += Math.sign(y - g.y);
			if (g.x === ax && g.y === y) g.inBar = true;
			return;
		}
		g.x -= side;
		if (side < 0 ? g.x >= px : g.x + GW - 1 <= px) {
			g.phase = "ether";
			g.until = now + rand(ETHER_MS);
		}
	}
};

const renderRows = (s) => {
	const cells = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null));
	const put = (x, y, ch, color) => {
		if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) cells[y][x] = { ch, color };
	};

	ART.forEach((line, y) => {
		for (let x = 0; x < line.length; x++) if (line[x] !== " ") put(s.startX + x, s.startY + y, line[x]);
	});
	for (const L of s.letters) put(L.x, L.y, L.ch, L.color);

	const span = ghostSpan(s);
	const g = s.ghost;
	if (span)
		GHOST[g.mood || "tired"][g.facing > 0 ? "right" : "left"].forEach((row, dy) => {
			for (let dx = row.search(/\S/); dx < row.length; dx++) {
				const x = g.x + dx;
				if (x >= span.x0 && x <= span.x1) put(x, g.y + dy, row[dx], GHOST_COLOR);
			}
		});

	return cells.map((row, y) => {
		const els = [];
		let buf = "";
		row.forEach((cell, x) => {
			if (cell?.color) {
				if (buf) els.push(buf);
				buf = "";
				els.push(
					<span key={x} style={cell.color === GHOST_COLOR ? styles.ghost : { color: cell.color }}>
						{cell.ch}
					</span>
				);
			} else buf += cell ? cell.ch : " ";
		});
		if (buf) els.push(buf);
		return (
			<div key={y} style={styles.row}>
				{els}
			</div>
		);
	});
};

const HalloweenHeader = () => {
	const gridRef = useRef(null);
	const sim = useRef(null);
	if (!sim.current) sim.current = newSim();
	const [, setFrame] = useState(0);

	// Centre the art in the visible part of the grid, as the normal header does.
	useEffect(() => {
		const el = gridRef.current;
		if (!el) return;
		const measure = () => {
			const ruler = document.createElement("span");
			ruler.textContent = "0";
			ruler.style.cssText = "visibility:hidden;position:absolute;white-space:pre;width:1ch";
			el.appendChild(ruler);
			const chPx = ruler.getBoundingClientRect().width || 8;
			el.removeChild(ruler);
			const cols = clamp(Math.floor(el.clientWidth / chPx), 1, GRID_WIDTH);
			const x = clamp(
				Math.floor((cols - ART_WIDTH) / 2),
				HORIZONTAL_PADDING,
				Math.max(HORIZONTAL_PADDING, GRID_WIDTH - ART_WIDTH - HORIZONTAL_PADDING)
			);
			sim.current.cols = cols;
			sim.current.startX = clamp(x, 0, GRID_WIDTH - ART_WIDTH);
			setFrame((f) => f + 1);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const s = sim.current;
		// Without motion, just show the ghost half out of D's stem.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			const p = PORTALS[0];
			const { px, y } = portalAt(s, p);
			Object.assign(s.ghost, { phase: "emerging", portal: p, y, x: px - Math.ceil(GW / 2) });
			setFrame((f) => f + 1);
			return;
		}
		s.ghost.until = performance.now() + 1500;
		const id = setInterval(() => {
			const now = performance.now();
			if (now - s.lastGhostStep >= MOODS[s.ghost.mood || "tired"].stepMs) {
				s.lastGhostStep = now;
				stepGhost(s, now);
			}
			stepLetters(s, now);
			setFrame((f) => f + 1);
		}, TICK_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<div className="ascii-banner" style={styles.container}>
			<div ref={gridRef} style={styles.grid}>
				<div style={{ position: "relative", margin: 0 }}>{renderRows(sim.current)}</div>
			</div>
		</div>
	);
};

export default HalloweenHeader;
