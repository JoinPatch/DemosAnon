// Christmas bits for the DEMOS header: light snow and snowy ground. Flakes
// drift down through the empty cells, settle on top of the letters or the
// ground for a few seconds, then melt away.

export const SNOW_COLOR = "var(--text-color-alt)";

const MAX_FLAKES = 30;
const SPAWN_CHANCE = 0.25; // per tick
const FALL_MS = [350, 700]; // time to fall one row
const SETTLE_MS = [2500, 6000]; // how long a settled flake stays
const DRIFT_CHANCE = 0.3; // chance a step also drifts a column sideways

const rand = ([lo, hi]) => lo + Math.random() * (hi - lo);

// `isArt(x, y)` says whether that cell is part of the DEMOS art.
export const stepSnow = (flakes, { cols, rows, isArt }, now) => {
	const next = [];
	for (const f of flakes) {
		if (f.settledUntil) {
			if (now < f.settledUntil) next.push(f);
			continue;
		}
		if (now - f.lastMove < f.fallMs) {
			next.push(f);
			continue;
		}
		f.lastMove = now;
		let nx = f.x;
		if (Math.random() < DRIFT_CHANCE) nx += Math.random() < 0.5 ? -1 : 1;
		if (nx < 0 || nx >= cols || isArt(nx, f.y)) nx = f.x;
		const ny = f.y + 1;
		if (ny >= rows || isArt(nx, ny)) {
			f.x = nx;
			f.settledUntil = now + rand(SETTLE_MS);
		} else {
			f.x = nx;
			f.y = ny;
		}
		next.push(f);
	}
	if (next.length < MAX_FLAKES && Math.random() < SPAWN_CHANCE) {
		const x = Math.floor(Math.random() * cols);
		if (!isArt(x, 0))
			next.push({ x, y: 0, ch: Math.random() < 0.25 ? "*" : ".", fallMs: rand(FALL_MS), lastMove: now });
	}
	return next;
};

// Without motion, a still dusting of snow on top of the letters.
export const stillSnow = ({ cols, rows, isArt }) => {
	const flakes = [];
	for (let x = 0; x < cols; x++)
		for (let y = 1; y < rows; y++)
			if (isArt(x, y) && !isArt(x, y - 1)) {
				if (Math.random() < 0.35) flakes.push({ x, y: y - 1, ch: Math.random() < 0.25 ? "*" : ".", settledUntil: Infinity });
				break;
			}
	return flakes;
};

// Snowy ground along the bottom: a row of rounded m and n bumps in white and
// grey, with a few soft drifts rising into the row above. It's made once
// per header, so it stays put.
const GROUND_CHARS = "mmmmnn";
const DRIFT_CHARS = "_.-";
const SNOW_WHITE = "var(--text-color)";
const pickChar = (chars) => chars[Math.floor(Math.random() * chars.length)];
const tone = () => (Math.random() < 0.3 ? SNOW_WHITE : SNOW_COLOR);

export const makeGround = (cols, rows) => {
	const cells = [];
	for (let x = 0; x < cols; x++) cells.push({ x, y: rows - 1, ch: pickChar(GROUND_CHARS), color: tone() });
	for (let x = 0; x < cols; x++) {
		if (Math.random() > 0.05) continue;
		const w = 3 + Math.floor(Math.random() * 4);
		for (let dx = 0; dx < w && x + dx < cols; dx++)
			cells.push({ x: x + dx, y: rows - 2, ch: dx === 0 || dx === w - 1 ? "." : pickChar(DRIFT_CHARS), color: SNOW_COLOR });
		x += w + 4;
	}
	return cells;
};
