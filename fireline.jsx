import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================
// FIRELINE — wildfire prevention strategy game
// ============================================================

// ---------- Cell types & states ----------
const CELL = { GRASS: 'g', FOREST: 'f', DENSE: 'F', WATER: 'w', ROAD: 'r', STRUCTURE: 'h', DIRT: 'd' };
const STATE_N = 'normal', STATE_C = 'ctrl', STATE_B = 'burn', STATE_X = 'ash';
const PH_BRIEF = 'brief', PH_PLAN = 'plan', PH_SIM = 'sim', PH_RES = 'res';
const PH_REVEAL = 'reveal', PH_REVEAL_SIM = 'rsim';

// ---------- Levels (hand-built ASCII maps) ----------
// Legend: . grass | f forest | F dense forest | ~ water | = road | H structure | * fire origin | o cleared
const LEVELS = [
  {
    id: 1, name: 'CEDAR MESA', region: 'SAN LUCIA FOOTHILLS · SECTOR 04',
    map: [
      '*Ff.......~~..',
      'fFF.......~~..',
      'fFf........~..',
      'ff............',
      '..........=...',
      '==========....',
      '..............',
      '...H...H..H...',
      '.H..........H.',
      '......H.......',
    ],
    wind: { dirDeg: 135, speed: 11 },
    moisture: 32, temperature: 86,
    burnAllowance: 10, saveTarget: 4,
    briefing: 'Dry brush in the foothills. Smoke spotted at the ridge. Establish firebreaks before flames reach the homes.',
  },
  {
    id: 2, name: 'PINE HOLLOW', region: 'NORTHWOOD RESERVE · SECTOR 11',
    map: [
      '*...............',
      '..fff...........',
      '.fFFf.....~.....',
      'fFFFFf....~.....',
      '.fFFf.....~~....',
      '..ff......~~....',
      '...........~~..',
      '..H..H..........',
      '......H...H.....',
      '.H............H.',
      '....H.....H.....',
    ],
    wind: { dirDeg: 100, speed: 18 },
    moisture: 18, temperature: 94,
    burnAllowance: 12, saveTarget: 5,
    briefing: 'Lightning strike in the pine canopy. Hot, dry, and gusty. Heavy fuel load — and the cabins sit directly downwind.',
  },
  {
    id: 3, name: 'SAGE CANYON', region: 'OUTER RIDGE DISTRICT · SECTOR 27',
    map: [
      '*.................',
      '..fF..fff.........',
      '.fFF..fFf.........',
      '.fFf...ff.........',
      '..f...............',
      '..................',
      '==================',
      '..H..H..H..H..H...',
      '.H..H...H..H...H..',
      '...H..H...H..H....',
      '..H...H..H...H..H.',
      '...H..H...H..H....',
    ],
    wind: { dirDeg: 110, speed: 24 },
    moisture: 9, temperature: 102,
    burnAllowance: 16, saveTarget: 14,
    briefing: 'Red Flag warning in effect. Suburb directly downwind of ignition. Hold the line — do not let fire cross the road.',
  },
];

// ---------- Color tokens ----------
const C = {
  bg: '#0a0d09', panel: '#13160f', panel2: '#1a1e16',
  border: '#2a2f24', borderSoft: '#1f2319',
  text: '#e8e3d6', textDim: '#8a8478', textMuted: '#4a4640',
  accent: '#ff6b35', accentDim: '#a84520',
  fire1: '#ff5722', fire2: '#ffb74d', fireGlow: 'rgba(255, 107, 53, 0.55)',
  cool: '#5fc8d8', warning: '#ffc857', mint: '#7fb069',
  grass1: '#3d5a2a', grass2: '#4d6e36',
  forest1: '#2c4220', forest2: '#34501f',
  dense1: '#1c2c12', dense2: '#243918',
  water1: '#1c3c5a', water2: '#2a5878',
  road: '#3a3833',
  structure: '#cdb88a', structureRoof: '#7a4a2a',
  ash: '#0e0c0a', ash2: '#1a1714',
  ctrl1: '#3d2614', ctrl2: '#5a3a1f',
};

// ---------- Helpers ----------
const dirLabel = (d) =>
  ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(d / 22.5) % 16];

function parseLevel(level) {
  const H = level.map.length;
  const W = Math.max(...level.map.map(r => r.length));
  let origin = { x: 0, y: 0 };
  let totalStructures = 0;
  const grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    const r = level.map[y].padEnd(W, '.');
    for (let x = 0; x < W; x++) {
      const ch = r[x];
      let type = CELL.GRASS, isOrigin = false;
      if (ch === 'f') type = CELL.FOREST;
      else if (ch === 'F') type = CELL.DENSE;
      else if (ch === '~') type = CELL.WATER;
      else if (ch === '=') type = CELL.ROAD;
      else if (ch === 'H') { type = CELL.STRUCTURE; totalStructures++; }
      else if (ch === 'o') type = CELL.DIRT;
      else if (ch === '*') { isOrigin = true; origin = { x, y }; }
      row.push({ type, state: STATE_N, burnAge: 0, isOrigin });
    }
    grid.push(row);
  }
  return { grid, W, H, origin, totalStructures };
}

const FUEL_PROB = {
  [CELL.GRASS]: 0.22,
  [CELL.FOREST]: 0.27,
  [CELL.DENSE]: 0.34,
  [CELL.STRUCTURE]: 0.16,
};
const BURN_DUR = {
  [CELL.GRASS]: 2,
  [CELL.FOREST]: 4,
  [CELL.DENSE]: 6,
  [CELL.STRUCTURE]: 4,
};

function tickSim(grid, conditions, W, H) {
  const next = grid.map(row => row.map(c => ({ ...c })));
  const windRad = conditions.wind.dirDeg * Math.PI / 180;
  const wx = Math.sin(windRad);
  const wy = -Math.cos(windRad);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (c.state !== STATE_B) continue;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (next[ny][nx].state !== STATE_N) continue;
          const fuel = FUEL_PROB[grid[ny][nx].type] || 0;
          if (fuel === 0) continue;

          const len = Math.hypot(dx, dy);
          const dot = (dx / len) * wx + (dy / len) * wy;
          const windFactor = Math.max(0.05, 1 + dot * (conditions.wind.speed / 12));
          const moistFactor = Math.max(0.08, (100 - conditions.moisture) / 65);
          const tempFactor = Math.max(0.3, 0.5 + (conditions.temperature - 55) / 55);
          const diag = (Math.abs(dx) + Math.abs(dy) === 2) ? 0.65 : 1;
          const prob = fuel * windFactor * moistFactor * tempFactor * diag;

          if (Math.random() < prob) {
            next[ny][nx].state = STATE_B;
            next[ny][nx].burnAge = 0;
          }
        }
      }
      next[y][x].burnAge = (c.burnAge || 0) + 1;
      const dur = BURN_DUR[c.type] || 3;
      if (next[y][x].burnAge >= dur) next[y][x].state = STATE_X;
    }
  }
  return next;
}

function predictHeatmap(baseGrid, conditions, W, H, origin, runs = 22, ticks = 35) {
  const counts = Array.from({ length: H }, () => Array(W).fill(0));
  for (let r = 0; r < runs; r++) {
    let g = baseGrid.map(row => row.map(c => ({ ...c })));
    g[origin.y][origin.x].state = STATE_B;
    g[origin.y][origin.x].burnAge = 0;
    for (let t = 0; t < ticks; t++) g = tickSim(g, conditions, W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (g[y][x].state === STATE_B || g[y][x].state === STATE_X) counts[y][x]++;
  }
  return counts.map(row => row.map(c => c / runs));
}

function countStructures(grid) {
  let saved = 0, lost = 0;
  for (const row of grid) for (const c of row) {
    if (c.type === CELL.STRUCTURE) {
      if (c.state === STATE_X || c.state === STATE_B) lost++;
      else saved++;
    }
  }
  return { saved, lost };
}

// ---------- Optimal burn placement (greedy DPV) ----------
// "Downstream Protection Value" approximation: for each candidate cell, treat it
// as a firebreak and Monte-Carlo simulate how many structures survive. Greedy
// pick the cell with highest marginal gain; repeat until budget exhausted.
// Pruning: only consider combustible cells that the baseline fire actually
// reaches with non-trivial probability — that's where firebreaks matter.

const yieldToBrowser = () => new Promise(r => setTimeout(r, 0));

async function computeOptimalSolution(baseGrid, conditions, W, H, origin, budget, totalStructures, onProgress) {
  // 1. Get baseline burn probability map to identify candidate region
  const baselineHeat = predictHeatmap(baseGrid, conditions, W, H, origin, 18, 38);
  await yieldToBrowser();

  // 2. Build candidate pool: combustible cells with meaningful burn probability
  const candidates = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = baseGrid[y][x];
      if (c.isOrigin) continue;
      if (c.type !== CELL.GRASS && c.type !== CELL.FOREST && c.type !== CELL.DENSE) continue;
      if (baselineHeat[y][x] >= 0.08) {
        candidates.push({ x, y, prob: baselineHeat[y][x] });
      }
    }
  }
  // Sort hot-first so early greedy iterations evaluate strongest options first
  candidates.sort((a, b) => b.prob - a.prob);
  const pool = candidates.slice(0, 60);

  // Helper: average structures saved with given firebreaks across N stochastic sims
  const evaluate = (firebreaks, runs, ticks) => {
    let total = 0;
    for (let r = 0; r < runs; r++) {
      let g = baseGrid.map(row => row.map(c => ({ ...c })));
      for (const fb of firebreaks) g[fb.y][fb.x].state = STATE_C;
      g[origin.y][origin.x].state = STATE_B;
      g[origin.y][origin.x].burnAge = 0;
      for (let t = 0; t < ticks; t++) g = tickSim(g, conditions, W, H);
      total += countStructures(g).saved;
    }
    return total / runs;
  };

  // Baseline (no intervention) for comparison
  const baselineSaved = evaluate([], 6, 38);
  await yieldToBrowser();

  // 3. Greedy selection
  const selected = [];
  for (let i = 0; i < budget; i++) {
    let bestCell = null, bestScore = -Infinity;
    for (const cand of pool) {
      if (selected.some(s => s.x === cand.x && s.y === cand.y)) continue;
      const score = evaluate([...selected, cand], 3, 32);
      if (score > bestScore) { bestScore = score; bestCell = cand; }
    }
    if (!bestCell) break;
    selected.push({ x: bestCell.x, y: bestCell.y, order: i + 1 });
    if (onProgress) onProgress((i + 1) / budget);
    await yieldToBrowser();
    // Early stop if everyone's saved
    if (bestScore >= totalStructures - 0.05) break;
  }

  // 4. Final accuracy pass
  const expectedSaved = evaluate(selected, 10, 40);
  return { cells: selected, expectedSaved, baselineSaved };
}

// ---------- Subcomponents ----------
function StructureIcon({ size = 14, burning, burned }) {
  const fill = burned ? '#1a1714' : burning ? '#ff8a4c' : C.structure;
  const roof = burned ? '#0a0907' : burning ? '#ff5722' : C.structureRoof;
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ display: 'block' }}>
      <path d="M2.5 8 L8 3.5 L13.5 8 L13.5 13 L2.5 13 Z" fill={fill} stroke="#000" strokeOpacity="0.5" strokeWidth="0.6" />
      <path d="M1.8 8 L8 2.8 L14.2 8 L13.2 8.4 L8 4 L2.8 8.4 Z" fill={roof} />
      <rect x="6.7" y="9.4" width="2.6" height="3.6" fill="#000" fillOpacity="0.55" />
    </svg>
  );
}

function FlameIcon({ size = 12 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ display: 'block' }}>
      <path d="M8 2 C 9 4 11 5 11 8 C 11 10 10 12 8 12 C 6 12 5 10 5 8 C 5 6 6 5 7 4 Z"
        fill="#ff5722" />
      <path d="M8 5 C 9 6.5 9.5 7.5 9 9 C 8.5 10.5 7 10.5 7 9 C 7 8 7.5 7 8 5 Z" fill="#ffb74d" />
    </svg>
  );
}

function WindRose({ dirDeg, speed }) {
  return (
    <div style={{ position: 'relative', width: 56, height: 56 }}>
      <svg viewBox="0 0 56 56" width={56} height={56}>
        <circle cx="28" cy="28" r="25" fill="none" stroke={C.border} strokeWidth="1" />
        <circle cx="28" cy="28" r="19" fill="none" stroke={C.borderSoft} strokeWidth="1" strokeDasharray="2 3" />
        {['N', 'E', 'S', 'W'].map((d, i) => (
          <text key={d} x={28 + 22 * Math.sin(i * Math.PI / 2)} y={28 - 22 * Math.cos(i * Math.PI / 2) + 3.2}
            textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="'IBM Plex Mono',monospace">{d}</text>
        ))}
        <g transform={`rotate(${dirDeg} 28 28)`}>
          <path d="M28 10 L24 28 L28 24 L32 28 Z" fill={C.accent} />
          <circle cx="28" cy="28" r="2.2" fill={C.accent} />
        </g>
      </svg>
    </div>
  );
}

function GridCell({ cell, x, y, prediction, phase, onClick, cellSize, optimalOrder }) {
  const t = cell.type;
  let bg;
  if (t === CELL.GRASS) bg = `linear-gradient(135deg, ${C.grass1}, ${C.grass2})`;
  else if (t === CELL.FOREST) bg = `linear-gradient(135deg, ${C.forest1}, ${C.forest2})`;
  else if (t === CELL.DENSE) bg = `linear-gradient(135deg, ${C.dense1}, ${C.dense2})`;
  else if (t === CELL.WATER) bg = `linear-gradient(135deg, ${C.water1}, ${C.water2})`;
  else if (t === CELL.ROAD) bg = C.road;
  else if (t === CELL.DIRT) bg = '#5a4a32';
  else bg = `linear-gradient(135deg, ${C.grass1}, ${C.grass2})`;

  const isBurning = cell.state === STATE_B;
  const isAsh = cell.state === STATE_X;
  const isCtrl = cell.state === STATE_C;
  const inReveal = phase === PH_REVEAL || phase === PH_REVEAL_SIM;

  let overlay = null;
  if (isCtrl) {
    // In reveal mode, optimal-solution burns get a cyan/mint look to
    // differentiate visually from the orange controlled burns the user placed.
    const c1 = inReveal ? '#0e3a3f' : C.ctrl1;
    const c2 = inReveal ? '#1a5a64' : C.ctrl2;
    overlay = (
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        boxShadow: inReveal
          ? `inset 0 0 6px rgba(0,0,0,0.5), 0 0 ${cellSize * 0.4}px rgba(95,200,216,0.5)`
          : 'inset 0 0 6px rgba(0,0,0,0.5)',
      }} />
    );
  } else if (isBurning) {
    overlay = (
      <div className="fl-burning" style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 60%, ${C.fire2}, ${C.fire1} 60%, ${C.accentDim} 100%)`,
        boxShadow: `0 0 ${cellSize * 0.8}px ${C.fireGlow}, inset 0 0 6px rgba(255,180,80,0.6)`,
      }} />
    );
  } else if (isAsh) {
    overlay = (
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${C.ash}, ${C.ash2})`,
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.7)',
      }} />
    );
  }

  // AI prediction heatmap during planning
  let predOverlay = null;
  if (phase === PH_PLAN && prediction != null && prediction > 0.05 && !isCtrl) {
    const op = Math.min(0.55, prediction * 0.7);
    predOverlay = (
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle, rgba(255,87,34,${op}) 0%, rgba(255,87,34,${op * 0.4}) 70%, transparent 100%)`,
        mixBlendMode: 'screen', pointerEvents: 'none',
      }} />
    );
  }

  const clickable = phase === PH_PLAN &&
    !cell.isOrigin &&
    (t === CELL.GRASS || t === CELL.FOREST || t === CELL.DENSE) &&
    (cell.state === STATE_N || cell.state === STATE_C);

  const showStructure = t === CELL.STRUCTURE;
  const iconSize = Math.max(10, cellSize * 0.6);

  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        position: 'relative',
        background: bg,
        cursor: clickable ? 'pointer' : 'default',
        outline: cell.isOrigin ? `1px solid ${C.fire1}` : 'none',
        outlineOffset: cell.isOrigin ? '-1px' : 0,
        overflow: 'hidden',
      }}
      className={clickable ? 'fl-clickable' : ''}
    >
      {overlay}
      {predOverlay}
      {/* Optimal-solution priority badge (1, 2, 3...) shown on the reveal map */}
      {optimalOrder && phase === PH_REVEAL && cellSize >= 18 && (
        <div style={{
          position: 'absolute', top: 1, left: 2,
          fontSize: Math.max(8, cellSize * 0.32),
          color: C.cool, fontWeight: 700,
          fontFamily: "'IBM Plex Mono',monospace",
          textShadow: '0 0 3px rgba(0,0,0,0.9)',
          lineHeight: 1, pointerEvents: 'none',
        }}>{optimalOrder}</div>
      )}
      {showStructure && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <StructureIcon size={iconSize} burning={isBurning} burned={isAsh} />
        </div>
      )}
      {cell.isOrigin && phase !== PH_BRIEF && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '40%', height: '40%', borderRadius: '50%',
            background: C.accent,
            boxShadow: `0 0 ${cellSize * 0.4}px ${C.fire1}`,
            animation: 'fl-pulse 1.4s ease-in-out infinite',
          }} />
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, unit, accent, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '10px 14px', borderBottom: `1px solid ${C.borderSoft}`,
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    }}>
      <div>
        <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.18em' }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontSize: 26, fontWeight: 700, lineHeight: 1,
          color: accent || C.text, letterSpacing: '0.02em',
        }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: C.textDim }}>{unit}</span>}
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================
export default function FirelineApp() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [phase, setPhase] = useState(PH_BRIEF);
  const [grid, setGrid] = useState(null);
  const [W, setW] = useState(0);
  const [H, setH] = useState(0);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [totalStructures, setTotalStructures] = useState(0);
  const [burnsUsed, setBurnsUsed] = useState(0);
  const [tick, setTick] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [results, setResults] = useState(null);
  const [optimal, setOptimal] = useState(null); // { cells, expectedSaved, baselineSaved }
  const [computingOptimal, setComputingOptimal] = useState(false);
  const [optimalProgress, setOptimalProgress] = useState(0);
  const [revealResults, setRevealResults] = useState(null); // results after running optimal sim
  const intervalRef = useRef(null);
  const baseSnapshotRef = useRef(null); // pristine grid for the level (no burns, no fire)

  const level = LEVELS[levelIdx];

  // Inject font + animations once
  useEffect(() => {
    const id = 'fl-font-style';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;600;800;900&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap';
      document.head.appendChild(link);

      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes fl-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes fl-flicker {
          0%, 100% { filter: brightness(1) saturate(1); }
          25% { filter: brightness(1.15) saturate(1.1); }
          50% { filter: brightness(0.85) saturate(0.9); }
          75% { filter: brightness(1.1) saturate(1.05); }
        }
        .fl-burning { animation: fl-flicker 0.45s ease-in-out infinite; }
        .fl-clickable:hover { box-shadow: inset 0 0 0 2px rgba(255, 200, 87, 0.55) !important; }
        .fl-btn:hover:not(:disabled) { background: #ff8a4c !important; }
        .fl-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .fl-scanline { 
          background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px);
        }
        @keyframes fl-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fl-fade { animation: fl-fade-in 0.4s ease-out; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Load level
  const loadLevel = useCallback((idx) => {
    const lvl = LEVELS[idx];
    const { grid: g, W: w, H: h, origin: o, totalStructures: ts } = parseLevel(lvl);
    setGrid(g); setW(w); setH(h); setOrigin(o); setTotalStructures(ts);
    setBurnsUsed(0); setTick(0); setResults(null); setPrediction(null);
    setOptimal(null); setComputingOptimal(false); setOptimalProgress(0);
    setRevealResults(null);
    baseSnapshotRef.current = g.map(row => row.map(c => ({ ...c })));
    setPhase(PH_BRIEF);
  }, []);

  useEffect(() => { loadLevel(levelIdx); }, [levelIdx, loadLevel]);

  // Compute prediction when entering planning
  useEffect(() => {
    if (phase === PH_PLAN && grid && !prediction) {
      // Run heatmap async-ish so UI doesn't freeze
      const id = setTimeout(() => {
        const heat = predictHeatmap(grid, level, W, H, origin);
        setPrediction(heat);
      }, 30);
      return () => clearTimeout(id);
    }
  }, [phase, grid, level, W, H, origin, prediction]);

  // Sim tick interval — handles both player simulation and optimal-solution simulation
  useEffect(() => {
    if (phase !== PH_SIM && phase !== PH_REVEAL_SIM) return;
    intervalRef.current = setInterval(() => {
      setGrid(g => {
        if (!g) return g;
        const next = tickSim(g, level, W, H);
        let burning = false;
        for (const row of next) for (const c of row) if (c.state === STATE_B) { burning = true; break; }
        if (!burning) {
          clearInterval(intervalRef.current);
          setTimeout(() => {
            const { saved, lost } = countStructures(next);
            if (phase === PH_SIM) {
              setResults({ saved, lost, total: totalStructures });
              setPhase(PH_RES);
            } else {
              // Optimal sim finished
              setRevealResults({ saved, lost, total: totalStructures });
            }
          }, 400);
        }
        return next;
      });
      setTick(t => t + 1);
    }, 220);
    return () => clearInterval(intervalRef.current);
  }, [phase, level, W, H, totalStructures]);

  // Cell click -> toggle controlled burn
  const onCellClick = useCallback((x, y) => {
    if (phase !== PH_PLAN) return;
    setGrid(g => {
      const next = g.map(r => r.map(c => ({ ...c })));
      const c = next[y][x];
      if (c.state === STATE_C) {
        c.state = STATE_N;
        setBurnsUsed(b => b - 1);
      } else if (c.state === STATE_N && (c.type === CELL.GRASS || c.type === CELL.FOREST || c.type === CELL.DENSE)) {
        if (burnsUsed >= level.burnAllowance) return g;
        c.state = STATE_C;
        setBurnsUsed(b => b + 1);
      }
      return next;
    });
  }, [phase, burnsUsed, level]);

  // Start simulation
  const igniteFire = useCallback(() => {
    setGrid(g => {
      const next = g.map(r => r.map(c => ({ ...c })));
      next[origin.y][origin.x].state = STATE_B;
      next[origin.y][origin.x].burnAge = 0;
      return next;
    });
    setPhase(PH_SIM);
    setTick(0);
  }, [origin]);

  const restart = useCallback(() => loadLevel(levelIdx), [loadLevel, levelIdx]);
  const nextLevel = useCallback(() => {
    if (levelIdx < LEVELS.length - 1) setLevelIdx(levelIdx + 1);
  }, [levelIdx]);

  // Compute the optimal solution and switch to reveal mode
  const revealOptimal = useCallback(async () => {
    if (!baseSnapshotRef.current) return;
    setComputingOptimal(true);
    setOptimalProgress(0);
    // Yield once so the loading UI paints
    await new Promise(r => setTimeout(r, 50));
    const sol = await computeOptimalSolution(
      baseSnapshotRef.current, level, W, H, origin,
      level.burnAllowance, totalStructures,
      (p) => setOptimalProgress(p)
    );
    setOptimal(sol);
    // Build a fresh grid with optimal cells marked as controlled burns
    const fresh = baseSnapshotRef.current.map(row => row.map(c => ({ ...c })));
    for (const cell of sol.cells) fresh[cell.y][cell.x].state = STATE_C;
    setGrid(fresh);
    setComputingOptimal(false);
    setRevealResults(null);
    setTick(0);
    setPhase(PH_REVEAL);
  }, [level, W, H, origin, totalStructures]);

  // Run the optimal-solution simulation
  const igniteOptimalFire = useCallback(() => {
    setGrid(g => {
      const next = g.map(r => r.map(c => ({ ...c })));
      next[origin.y][origin.x].state = STATE_B;
      next[origin.y][origin.x].burnAge = 0;
      return next;
    });
    setRevealResults(null);
    setTick(0);
    setPhase(PH_REVEAL_SIM);
  }, [origin]);

  // Return to the post-fire report from reveal mode
  const backToReport = useCallback(() => {
    setPhase(PH_RES);
  }, []);

  // Replay the optimal sim from the start
  const replayOptimal = useCallback(() => {
    if (!optimal) return;
    const fresh = baseSnapshotRef.current.map(row => row.map(c => ({ ...c })));
    for (const cell of optimal.cells) fresh[cell.y][cell.x].state = STATE_C;
    setGrid(fresh);
    setRevealResults(null);
    setTick(0);
    setPhase(PH_REVEAL);
  }, [optimal]);

  // Build quick lookup for optimal-cell badges
  const optimalLookup = useMemo(() => {
    if (!optimal) return null;
    const m = {};
    optimal.cells.forEach(c => { m[`${c.x},${c.y}`] = c.order; });
    return m;
  }, [optimal]);

  if (!grid) return null;

  // Determine condition severity tags
  const moistTag = level.moisture < 15 ? 'CRITICAL' : level.moisture < 25 ? 'LOW' : 'MODERATE';
  const moistColor = level.moisture < 15 ? C.fire1 : level.moisture < 25 ? C.warning : C.mint;
  const tempTag = level.temperature > 100 ? 'EXTREME' : level.temperature > 90 ? 'HIGH' : 'MODERATE';
  const tempColor = level.temperature > 100 ? C.fire1 : level.temperature > 90 ? C.warning : C.mint;
  const windTag = level.wind.speed > 20 ? 'GUSTY' : level.wind.speed > 13 ? 'BREEZY' : 'CALM';
  const windColor = level.wind.speed > 20 ? C.fire1 : level.wind.speed > 13 ? C.warning : C.cool;

  const remainingBurns = level.burnAllowance - burnsUsed;

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, #14180f 0%, ${C.bg} 60%)`,
      color: C.text,
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      padding: '12px',
      boxSizing: 'border-box',
    }} className="fl-scanline">

      {/* HEADER */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', marginBottom: 12,
        border: `1px solid ${C.border}`, background: C.panel,
        gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: C.fire1,
            boxShadow: `0 0 8px ${C.fire1}`, animation: 'fl-pulse 2s ease-in-out infinite',
          }} />
          <div>
            <div style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontSize: 22, fontWeight: 900, letterSpacing: '0.18em', lineHeight: 1,
            }}>FIRELINE</div>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.25em', marginTop: 2 }}>
              WILDFIRE PREVENTION CONSOLE · v0.4
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 10, letterSpacing: '0.15em' }}>
          <div>
            <span style={{ color: C.textMuted }}>SECTOR </span>
            <span style={{ color: C.text }}>{String(level.id).padStart(2, '0')}/{String(LEVELS.length).padStart(2, '0')}</span>
          </div>
          <div style={{
            padding: '4px 10px', border: `1px solid ${C.border}`, background: C.panel2,
            color: phase === PH_SIM || phase === PH_REVEAL_SIM ? C.fire1
              : phase === PH_RES ? C.mint
              : phase === PH_REVEAL ? C.cool : C.warning,
          }}>
            {phase === PH_BRIEF && '> BRIEFING'}
            {phase === PH_PLAN && '> PLANNING'}
            {phase === PH_SIM && '> SIMULATION'}
            {phase === PH_RES && '> COMPLETE'}
            {phase === PH_REVEAL && '> OPTIMAL ANALYSIS'}
            {phase === PH_REVEAL_SIM && '> OPTIMAL SIMULATION'}
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'minmax(0, 1fr)',
      }} className="fl-main-grid">
        <style>{`
          @media (min-width: 880px) {
            .fl-main-grid { grid-template-columns: minmax(0, 1fr) 300px !important; }
          }
        `}</style>

        {/* LEFT: LEVEL TITLE + GRID */}
        <div style={{
          border: `1px solid ${C.border}`, background: C.panel,
          padding: 14, position: 'relative', minWidth: 0,
        }}>
          {/* Level header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.25em' }}>{level.region}</div>
              <div style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontSize: 32, fontWeight: 800, letterSpacing: '0.06em', lineHeight: 1,
                marginTop: 4,
              }}>{level.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {phase === PH_PLAN && (
                <div style={{
                  fontSize: 10, padding: '4px 10px', letterSpacing: '0.15em',
                  border: `1px solid ${C.accent}`, color: C.accent,
                }}>
                  AI PREDICTION ACTIVE
                </div>
              )}
              {phase === PH_SIM && (
                <div style={{
                  fontSize: 10, padding: '4px 10px', letterSpacing: '0.15em',
                  border: `1px solid ${C.fire1}`, color: C.fire1,
                  animation: 'fl-flicker 0.5s ease-in-out infinite',
                }}>
                  T+{tick}
                </div>
              )}
            </div>
          </div>

          {/* Grid map */}
          <div style={{
            border: `1px solid ${C.borderSoft}`,
            background: '#000', padding: 1,
            position: 'relative',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${W}, 1fr)`,
              gridTemplateRows: `repeat(${H}, 1fr)`,
              gap: 1,
              width: '100%',
              aspectRatio: `${W} / ${H}`,
            }}>
              {grid.map((row, y) =>
                row.map((cell, x) => (
                  <GridCell
                    key={`${x}-${y}`}
                    cell={cell} x={x} y={y}
                    prediction={prediction ? prediction[y][x] : null}
                    phase={phase}
                    cellSize={Math.min(40, 360 / W)}
                    onClick={() => onCellClick(x, y)}
                    optimalOrder={optimalLookup ? optimalLookup[`${x},${y}`] : null}
                  />
                ))
              )}
            </div>
          </div>

          {/* Legend toggle */}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <button
              onClick={() => setShowLegend(s => !s)}
              style={{
                background: 'none', border: `1px solid ${C.borderSoft}`,
                color: C.textDim, padding: '4px 10px', fontSize: 10, letterSpacing: '0.15em',
                fontFamily: 'inherit', cursor: 'pointer',
              }}>
              {showLegend ? '— LEGEND' : '+ LEGEND'}
            </button>
            {phase === PH_PLAN && (
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em' }}>
                TAP TERRAIN TO PLACE CONTROLLED BURN · <span style={{ color: C.accent }}>{remainingBurns}</span> REMAINING
              </div>
            )}
          </div>

          {showLegend && (
            <div className="fl-fade" style={{
              marginTop: 10, padding: 10, background: C.panel2,
              border: `1px solid ${C.borderSoft}`, fontSize: 10,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8,
            }}>
              <LegendItem color={`linear-gradient(135deg, ${C.grass1}, ${C.grass2})`} label="GRASS" />
              <LegendItem color={`linear-gradient(135deg, ${C.forest1}, ${C.forest2})`} label="FOREST" />
              <LegendItem color={`linear-gradient(135deg, ${C.dense1}, ${C.dense2})`} label="DENSE FOREST" />
              <LegendItem color={`linear-gradient(135deg, ${C.water1}, ${C.water2})`} label="WATER" />
              <LegendItem color={C.road} label="ROAD" />
              <LegendItem color={`linear-gradient(135deg, ${C.ctrl1}, ${C.ctrl2})`} label="CONTROLLED BURN" />
              <LegendItem color={`linear-gradient(135deg, ${C.ash}, ${C.ash2})`} label="BURNED" />
              <LegendItem icon={<StructureIcon size={11} />} label="STRUCTURE" />
            </div>
          )}
        </div>

        {/* RIGHT: METRICS & CONTROL PANEL */}
        <aside style={{
          border: `1px solid ${C.border}`, background: C.panel,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: C.panel2,
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.25em', color: C.textDim }}>FIELD READINGS</div>
            <div style={{ fontSize: 9, color: C.textMuted }}>● LIVE</div>
          </div>

          <MetricRow label="TEMPERATURE" value={level.temperature} unit="°F" accent={tempColor} sub={tempTag} />
          <MetricRow label="MOISTURE" value={level.moisture} unit="%" accent={moistColor} sub={moistTag} />

          {/* Wind row with rose */}
          <div style={{
            padding: '12px 14px', borderBottom: `1px solid ${C.borderSoft}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.18em' }}>WIND</div>
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                {windTag} · FROM {dirLabel((level.wind.dirDeg + 180) % 360)}
              </div>
              <div style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontSize: 26, fontWeight: 700, color: windColor, marginTop: 4, lineHeight: 1,
              }}>
                {level.wind.speed}<span style={{ fontSize: 11, color: C.textDim, fontWeight: 400, marginLeft: 4 }}>mph</span>
              </div>
            </div>
            <WindRose dirDeg={level.wind.dirDeg} speed={level.wind.speed} />
          </div>

          {/* Mission stats */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.borderSoft}` }}>
            <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.18em', marginBottom: 8 }}>MISSION</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: C.textDim }}>STRUCTURES</span>
              <span style={{ color: C.text }}>{totalStructures}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: C.textDim }}>SAVE TARGET</span>
              <span style={{ color: C.mint }}>≥ {level.saveTarget}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: C.textDim }}>BURN BUDGET</span>
              <span style={{ color: C.accent }}>{burnsUsed}/{level.burnAllowance}</span>
            </div>
            {/* Burn budget bar */}
            <div style={{ height: 4, background: C.borderSoft, marginTop: 8, position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0, right: 'auto',
                width: `${(burnsUsed / level.burnAllowance) * 100}%`,
                background: C.accent, transition: 'width 0.2s',
              }} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: 14, marginTop: 'auto' }}>
            {phase === PH_PLAN && (
              <button
                onClick={igniteFire}
                className="fl-btn"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: C.accent, color: '#0a0d09',
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontSize: 18, fontWeight: 800, letterSpacing: '0.2em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}>
                <FlameIcon size={16} /> IGNITE SIMULATION
              </button>
            )}
            {phase === PH_SIM && (
              <button disabled style={{
                width: '100%', padding: '14px 16px',
                background: C.panel2, color: C.fire1,
                border: `1px solid ${C.fire1}`,
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontSize: 16, fontWeight: 800, letterSpacing: '0.2em',
                animation: 'fl-flicker 0.5s ease-in-out infinite',
              }}>
                FIRE ACTIVE · T+{tick}
              </button>
            )}
            {(phase === PH_PLAN || phase === PH_SIM) && (
              <button
                onClick={restart}
                style={{
                  width: '100%', padding: '8px 12px', marginTop: 8,
                  background: 'transparent', color: C.textDim,
                  border: `1px solid ${C.borderSoft}`, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.2em',
                }}>
                RESET LEVEL
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* BRIEFING MODAL */}
      {phase === PH_BRIEF && (
        <Overlay>
          <div className="fl-fade" style={{
            maxWidth: 520, width: '100%',
            background: C.panel, border: `1px solid ${C.border}`,
            padding: 28,
          }}>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.3em' }}>{level.region}</div>
            <div style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontSize: 42, fontWeight: 900, letterSpacing: '0.05em', marginTop: 4,
              color: C.text,
            }}>{level.name}</div>
            <div style={{
              height: 1, background: `linear-gradient(90deg, ${C.accent}, transparent)`,
              margin: '14px 0',
            }} />
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 18 }}>
              {level.briefing}
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
              background: C.borderSoft, marginBottom: 18,
            }}>
              <BriefStat label="TEMP" value={`${level.temperature}°`} color={tempColor} />
              <BriefStat label="MOIST" value={`${level.moisture}%`} color={moistColor} />
              <BriefStat label="WIND" value={`${level.wind.speed} ${dirLabel(level.wind.dirDeg)}`} color={windColor} />
            </div>

            <div style={{
              fontSize: 11, color: C.textDim, marginBottom: 18,
              padding: 12, border: `1px dashed ${C.borderSoft}`, lineHeight: 1.6,
            }}>
              <span style={{ color: C.accent, letterSpacing: '0.15em' }}>OBJECTIVE</span><br />
              Save at least <span style={{ color: C.mint }}>{level.saveTarget} of {totalStructures}</span> structures.
              You have <span style={{ color: C.accent }}>{level.burnAllowance}</span> controlled-burn cells to lay firebreaks before ignition.
              The AI prediction model will overlay its forecast on the map.
            </div>

            <button
              onClick={() => setPhase(PH_PLAN)}
              className="fl-btn"
              style={{
                width: '100%', padding: '14px',
                background: C.accent, color: C.bg, border: 'none', cursor: 'pointer',
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontSize: 18, fontWeight: 800, letterSpacing: '0.25em',
              }}>
              DEPLOY TO FIELD →
            </button>
          </div>
        </Overlay>
      )}

      {/* RESULTS MODAL */}
      {phase === PH_RES && results && (
        <Overlay>
          {(() => {
            const success = results.saved >= level.saveTarget;
            const pct = Math.round((results.saved / results.total) * 100);
            return (
              <div className="fl-fade" style={{
                maxWidth: 520, width: '100%',
                background: C.panel, border: `1px solid ${success ? C.mint : C.fire1}`,
                padding: 28,
              }}>
                <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.3em' }}>
                  {level.name} · POST-FIRE REPORT
                </div>
                <div style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontSize: 48, fontWeight: 900, letterSpacing: '0.05em', marginTop: 4,
                  color: success ? C.mint : C.fire1,
                }}>
                  {success ? 'CONTAINED' : 'OVERRUN'}
                </div>
                <div style={{
                  height: 1, background: `linear-gradient(90deg, ${success ? C.mint : C.fire1}, transparent)`,
                  margin: '14px 0',
                }} />

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
                  background: C.borderSoft, marginBottom: 18,
                }}>
                  <BriefStat label="SAVED" value={`${results.saved}/${results.total}`} color={C.mint} />
                  <BriefStat label="LOST" value={results.lost} color={C.fire1} />
                  <BriefStat label="RATE" value={`${pct}%`} color={success ? C.mint : C.warning} />
                </div>

                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 18, lineHeight: 1.6 }}>
                  {success
                    ? `Firebreaks held. ${results.saved} structures preserved out of ${results.total}. Mission target of ${level.saveTarget} achieved.`
                    : `Fire breached the line. ${results.lost} structures lost. Target was ${level.saveTarget} saved — review your controlled burn placement.`}
                </div>

                {/* REVEAL OPTIMAL SOLUTION — the educational moment */}
                <button
                  onClick={revealOptimal}
                  disabled={computingOptimal}
                  style={{
                    width: '100%', padding: '12px',
                    background: 'transparent',
                    color: computingOptimal ? C.textDim : C.cool,
                    border: `1px solid ${computingOptimal ? C.borderSoft : C.cool}`,
                    cursor: computingOptimal ? 'wait' : 'pointer',
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontSize: 13, fontWeight: 700, letterSpacing: '0.22em',
                    marginBottom: 10,
                    position: 'relative', overflow: 'hidden',
                  }}>
                  {computingOptimal ? (
                    <>
                      <span style={{ position: 'relative', zIndex: 1 }}>
                        ANALYZING SCENARIO · {Math.round(optimalProgress * 100)}%
                      </span>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${optimalProgress * 100}%`,
                        background: 'rgba(95,200,216,0.18)',
                        transition: 'width 0.2s',
                      }} />
                    </>
                  ) : (
                    <>↗ REVEAL OPTIMAL SOLUTION</>
                  )}
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={restart}
                    style={{
                      flex: 1, padding: '12px',
                      background: 'transparent', color: C.text,
                      border: `1px solid ${C.border}`, cursor: 'pointer',
                      fontFamily: "'Big Shoulders Display', sans-serif",
                      fontSize: 14, fontWeight: 700, letterSpacing: '0.2em',
                    }}>
                    RETRY
                  </button>
                  {levelIdx < LEVELS.length - 1 ? (
                    <button
                      onClick={nextLevel}
                      disabled={!success}
                      className="fl-btn"
                      style={{
                        flex: 2, padding: '12px',
                        background: success ? C.mint : C.borderSoft,
                        color: success ? C.bg : C.textMuted,
                        border: 'none', cursor: success ? 'pointer' : 'not-allowed',
                        fontFamily: "'Big Shoulders Display', sans-serif",
                        fontSize: 14, fontWeight: 800, letterSpacing: '0.2em',
                      }}>
                      NEXT SECTOR →
                    </button>
                  ) : (
                    <button
                      onClick={() => setLevelIdx(0)}
                      style={{
                        flex: 2, padding: '12px',
                        background: C.accent, color: C.bg,
                        border: 'none', cursor: 'pointer',
                        fontFamily: "'Big Shoulders Display', sans-serif",
                        fontSize: 14, fontWeight: 800, letterSpacing: '0.2em',
                      }}>
                      RESTART CAMPAIGN
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </Overlay>
      )}

      {/* OPTIMAL ANALYSIS PANEL — shown over the side panel during reveal */}
      {(phase === PH_REVEAL || phase === PH_REVEAL_SIM) && optimal && (
        <div className="fl-fade" style={{
          position: 'fixed', top: 12, right: 12,
          width: 300, maxWidth: 'calc(100vw - 24px)', zIndex: 40,
          background: C.panel, border: `1px solid ${C.cool}`,
          padding: 0, fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${C.cool}`,
            background: 'rgba(95,200,216,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 9, color: C.cool, letterSpacing: '0.25em' }}>
                DPV OPTIMAL ANALYSIS
              </div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2, letterSpacing: '0.15em' }}>
                Greedy downstream protection
              </div>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: C.cool,
              boxShadow: `0 0 8px ${C.cool}`,
            }} />
          </div>

          <div style={{ padding: '14px' }}>
            <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.6, marginBottom: 14 }}>
              The model evaluated {optimal.cells.length} prescribed-burn cells by simulating thousands of fire scenarios and picking the cells that protect the most downstream structures per burn used. Numbered in priority order (1 = most critical).
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
              background: C.borderSoft, marginBottom: 12,
            }}>
              <BriefStat label="YOUR SAVES"
                value={results ? `${results.saved}/${results.total}` : '—'}
                color={results && results.saved >= level.saveTarget ? C.mint : C.warning} />
              <BriefStat label="OPTIMAL"
                value={`${Math.round(optimal.expectedSaved)}/${totalStructures}`}
                color={C.cool} />
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
              background: C.borderSoft, marginBottom: 14,
            }}>
              <BriefStat label="NO ACTION"
                value={`${Math.round(optimal.baselineSaved)}/${totalStructures}`}
                color={C.fire1} />
              <BriefStat label="CELLS USED"
                value={`${optimal.cells.length}/${level.burnAllowance}`}
                color={C.text} />
            </div>

            {phase === PH_REVEAL_SIM && (
              <div style={{
                fontSize: 10, color: C.fire1, letterSpacing: '0.15em',
                padding: '6px 10px', border: `1px solid ${C.fire1}`,
                marginBottom: 12, animation: 'fl-flicker 0.5s ease-in-out infinite',
                textAlign: 'center',
              }}>
                FIRE ACTIVE · T+{tick}
              </div>
            )}

            {revealResults && (
              <div style={{
                fontSize: 11, color: C.textDim, padding: 10,
                border: `1px solid ${C.borderSoft}`, marginBottom: 12, lineHeight: 1.6,
              }}>
                Optimal placement preserved <span style={{ color: C.cool }}>{revealResults.saved}/{revealResults.total}</span> structures vs. your <span style={{ color: results && results.saved >= level.saveTarget ? C.mint : C.warning }}>{results ? results.saved : 0}/{results ? results.total : 0}</span>.
              </div>
            )}

            {phase === PH_REVEAL && !revealResults && (
              <button
                onClick={igniteOptimalFire}
                className="fl-btn"
                style={{
                  width: '100%', padding: '12px',
                  background: C.cool, color: C.bg, border: 'none', cursor: 'pointer',
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontSize: 14, fontWeight: 800, letterSpacing: '0.2em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 8,
                }}>
                <FlameIcon size={14} /> RUN OPTIMAL SIM
              </button>
            )}
            {revealResults && (
              <button
                onClick={replayOptimal}
                style={{
                  width: '100%', padding: '10px',
                  background: 'transparent', color: C.cool,
                  border: `1px solid ${C.cool}`, cursor: 'pointer',
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.2em',
                  marginBottom: 8,
                }}>
                ↻ REPLAY
              </button>
            )}
            <button
              onClick={backToReport}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent', color: C.textDim,
                border: `1px solid ${C.borderSoft}`, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.2em',
              }}>
              ← BACK TO REPORT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Overlay({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(5, 7, 4, 0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {children}
    </div>
  );
}

function BriefStat({ label, value, color }) {
  return (
    <div style={{ background: C.panel2, padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.2em' }}>{label}</div>
      <div style={{
        fontFamily: "'Big Shoulders Display', sans-serif",
        fontSize: 22, fontWeight: 800, color, marginTop: 4, lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

function LegendItem({ color, label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon ? (
        <div style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      ) : (
        <div style={{ width: 14, height: 14, background: color, border: `1px solid ${C.borderSoft}` }} />
      )}
      <span style={{ color: C.textDim, fontSize: 9, letterSpacing: '0.12em' }}>{label}</span>
    </div>
  );
}
