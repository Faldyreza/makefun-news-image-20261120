// main.ts — news-image-20261120 v1 "RED FRIDAY"
// One day's world news (Friday 20 November 2026) as a dark trading-board
// front page, drawn entirely in code. Node 22+ stdlib only.
// Deterministic: fixed date string, no clock, no randomness, no network,
// no external files. Writes output/entry.png (1024x1024 PNG, <=1 MiB)
// and output/dossier.json. Never deletes /output.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const BG = [0x0a, 0x0e, 0x1a, 255];
const PANEL = [0x10, 0x18, 0x28, 255];
const PANEL_DARK = [0x0d, 0x15, 0x26, 255];
const BORDER = [0x22, 0x30, 0x4d, 255];
const GRID = [0x16, 0x20, 0x3a, 255];
const WHITE = [0xf2, 0xf5, 0xfa, 255];
const MUTED = [0xb9, 0xc4, 0xd8, 255];
const YELLOW = [0xff, 0xc5, 0x31, 255];
const RED = [0xe5, 0x48, 0x4d, 255];
const RED_BRIGHT = [0xff, 0x5a, 0x5a, 255];
const RED_SOFT = [0xff, 0x6b, 0x6b, 255];
const GREEN = [0x2f, 0xbf, 0x71, 255];
const GREEN_BRIGHT = [0x3d, 0xdc, 0x84, 255];
const BLACK = [0x00, 0x00, 0x00, 255];
const CHIP_RED_BG = [0x2a, 0x12, 0x16, 255];
const CHIP_RED_BD = [0x6b, 0x22, 0x28, 255];
const CHIP_GRN_BG = [0x0e, 0x2a, 0x1c, 255];
const CHIP_GRN_BD = [0x1f, 0x6b, 0x44, 255];
const FOOTER_BG = [0x07, 0x0b, 0x14, 255];
const STEEL = [0x5a, 0x6b, 0x8c, 255];
const STEEL_DARK = [0x2c, 0x3a, 0x55, 255];
const SMOKE = [0x7a, 0x84, 0x94, 255];
const BLUE = [0x8f, 0xb8, 0xff, 255];
const GLOBE_FILL = [0x0e, 0x1b, 0x33, 255];

// ------------------------------------------------------------- 5x7 font
// Hand-designed bitmap letterforms: 7 rows of 5 bits each, "#" = on.
// All-caps set covering every character used on the page.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00001", "00001", "00001", "00001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "00100", "00100", "00100"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00000", "01100", "01000"],
  ":": ["00000", "01100", "00000", "00000", "00000", "01100", "00000"],
  ";": ["00000", "01100", "00000", "00000", "00000", "01100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "\u2014": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "&": ["01100", "10010", "10010", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "\u00a3": ["00110", "01000", "10000", "11110", "10000", "01000", "11111"],
  "\u00b7": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
};

// ------------------------------------------------------------ framebuffer
type RGBA = [number, number, number, number];

class FB {
  w: number;
  h: number;
  buf: Buffer;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 4);
  }
  px(x: number, y: number, c: RGBA): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const a = c[3];
    if (a === 255) {
      this.buf[i] = c[0];
      this.buf[i + 1] = c[1];
      this.buf[i + 2] = c[2];
      this.buf[i + 3] = 255;
    } else if (a > 0) {
      const inv = 255 - a;
      this.buf[i] = (c[0] * a + this.buf[i] * inv) >> 8;
      this.buf[i + 1] = (c[1] * a + this.buf[i + 1] * inv) >> 8;
      this.buf[i + 2] = (c[2] * a + this.buf[i + 2] * inv) >> 8;
      this.buf[i + 3] = 255;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.px(xx, yy, c);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGBA): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    const half = Math.floor(t / 2);
    for (;;) {
      this.rect(x - half, y - half, t, t, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGBA): void {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      this.rect(cx - half, cy + dy, half * 2 + 1, 1, c);
    }
  }
  ring(cx: number, cy: number, r: number, t: number, c: RGBA): void {
    for (let a = 0; a < 720; a++) {
      const th = (a * Math.PI) / 360;
      const x = Math.round(cx + r * Math.cos(th));
      const y = Math.round(cy + r * Math.sin(th));
      this.rect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
      this.rect(cx - half, cy + dy, half * 2 + 1, 1, c);
    }
  }
  // Down-pointing triangle, apex at bottom.
  triDown(cx: number, y: number, w: number, h: number, c: RGBA): void {
    for (let r = 0; r <= h; r++) {
      const half = Math.floor(((r / h) * w) / 2);
      this.rect(cx - half, y + r, half * 2 + 1, 1, c);
    }
  }
  // Up-pointing triangle, apex at top.
  triUp(cx: number, y: number, w: number, h: number, c: RGBA): void {
    for (let r = 0; r <= h; r++) {
      const half = Math.floor((((h - r) / h) * w) / 2);
      this.rect(cx - half, y + r, half * 2 + 1, 1, c);
    }
  }
  poly(points: [number, number][], c: RGBA): void {
    // Scanline fill for a simple polygon.
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.rect(Math.floor(xs[k]), y, Math.ceil(xs[k + 1]) - Math.floor(xs[k]), 1, c);
      }
    }
  }
}

// ------------------------------------------------------------------- text
function textWidth(s: string, scale: number, spacing?: number): number {
  const sp = spacing === undefined ? scale : spacing;
  if (s.length === 0) return 0;
  return s.length * (5 * scale + sp) - sp;
}

function drawTextRaw(fb: FB, s: string, x: number, y: number, scale: number, c: RGBA, spacing?: number): void {
  const sp = spacing === undefined ? scale : spacing;
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") {
          fb.rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 5 * scale + sp;
  }
}

// Text with a black halo so it stays readable over the busy chart.
function drawText(fb: FB, s: string, x: number, y: number, scale: number, c: RGBA, spacing?: number, outline = false): void {
  if (outline) {
    const o = Math.max(2, Math.floor(scale / 2));
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]] as const) {
      drawTextRaw(fb, s, x + dx, y + dy, scale, BLACK, spacing);
    }
  }
  drawTextRaw(fb, s, x, y, scale, c, spacing);
}

function wrapText(s: string, maxW: number, scale: number, spacing?: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur === "" ? w : cur + " " + w;
    if (textWidth(cand, scale, spacing) <= maxW || cur === "") {
      cur = cand;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// -------------------------------------------------------------------- PNG
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(fb: FB): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(fb.w, 0);
  ihdr.writeUInt32BE(fb.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((fb.w * 4 + 1) * fb.h);
  for (let y = 0; y < fb.h; y++) {
    raw[y * (fb.w * 4 + 1)] = 0;
    fb.buf.copy(raw, y * (fb.w * 4 + 1) + 1, y * fb.w * 4, (y + 1) * fb.w * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- drawing
function panel(fb: FB, x: number, y: number, w: number, h: number, fill: RGBA): void {
  fb.rect(x, y, w, h, fill);
  fb.rect(x, y, w, 2, BORDER);
  fb.rect(x, y + h - 2, w, 2, BORDER);
  fb.rect(x, y, 2, h, BORDER);
  fb.rect(x + w - 2, y, 2, h, BORDER);
}

function drawMasthead(fb: FB): void {
  drawText(fb, "THE WORLD", 24, 16, 9, WHITE);
  const date = "FRIDAY, 20 NOVEMBER 2026";
  drawText(fb, date, 1024 - 24 - textWidth(date, 3), 22, 3, YELLOW);
  const tag = "ONE DAY \u00b7 ONE IMAGE";
  drawText(fb, tag, 1024 - 24 - textWidth(tag, 2), 60, 2, MUTED);
  fb.rect(0, 96, 1024, 4, RED);
}

function drawLead(fb: FB): void {
  const x0 = 8;
  const y0 = 108;
  const w = 1008;
  const h = 392;
  panel(fb, x0, y0, w, h, PANEL_DARK);

  // Faint horizontal gridlines.
  for (const gy of [160, 220, 280, 340, 400, 460]) {
    fb.rect(x0 + 2, gy, w - 4, 1, GRID);
  }

  // Giant falling candlestick chart, left to right.
  // Fixed closes: a steep fall with small up-jitters (verified shape only).
  const closes = [150, 172, 164, 192, 214, 206, 234, 258, 250, 278, 302, 294, 322, 348, 340, 368];
  const bodies = [26, 20, 24, 30, 22, 26, 28, 24, 30, 22, 26, 28, 24, 30, 22, 26];
  const n = closes.length;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const cx = 56 + i * 57;
    const close = closes[i];
    const body = bodies[i];
    const open = close - body;
    // Wick.
    fb.rect(cx + 13, open - 12, 4, body + 24, RED_BRIGHT);
    // Body.
    fb.rect(cx, open, 30, body, RED);
    pts.push([cx + 15, close]);
  }
  // Bright red line joining the closes.
  for (let i = 0; i + 1 < pts.length; i++) {
    fb.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 3, RED_BRIGHT);
  }

  // Headline over the chart (black halo for legibility).
  drawText(fb, "THE AI SELL-OFF", 24, 126, 6, WHITE, undefined, true);
  drawText(fb, "GOES GLOBAL", 24, 178, 6, WHITE, undefined, true);
  // Calm scrim behind the sub-headline and deck so the candle line and
  // wicks do not cut through the text.
  fb.rect(x0 + 2, 238, w - 4, 122, [0x0b, 0x12, 0x20, 150]);
  // Sub-headline.
  drawText(fb, "NIKKEI -4.8% \u00b7 KOSPI -5.2% \u00b7 TAIWAN -6%", 24, 246, 4, YELLOW, undefined, true);
  // Deck.
  const deck = "ANTHROPIC'S RECORD $81.3BN IPO FAILS TO CALM AI-BUBBLE FEARS; WALL STREET FALLS FOR A FIFTH STRAIGHT DAY.";
  const deckLines = wrapText(deck, 976, 3);
  deckLines.forEach((ln, i) => drawText(fb, ln, 24, 296 + i * 26, 3, WHITE, undefined, true));

  // Nikkei close label with a red down-triangle.
  fb.triDown(764, 404, 14, 14, RED);
  drawText(fb, "NIKKEI 56,594.94", 784, 404, 2, RED_SOFT, undefined, true);

  // Ticker chips along the bottom.
  const chips: { label: string; green: boolean }[] = [
    { label: "NIKKEI -4.8%", green: false },
    { label: "KOSPI -5.2%", green: false },
    { label: "TAIEX -6%", green: false },
    { label: "NASDAQ -2.3%", green: false },
    { label: "S&P 500 -2%", green: false },
    { label: "ANTHROPIC +17%", green: true },
  ];
  let cx = 24;
  const cy = 442;
  const ch = 38;
  for (const chip of chips) {
    const tw = textWidth(chip.label, 2);
    const cw = tw + 20;
    fb.rect(cx, cy, cw, ch, chip.green ? CHIP_GRN_BG : CHIP_RED_BG);
    fb.rect(cx, cy, cw, 2, chip.green ? CHIP_GRN_BD : CHIP_RED_BD);
    fb.rect(cx, cy + ch - 2, cw, 2, chip.green ? CHIP_GRN_BD : CHIP_RED_BD);
    fb.rect(cx, cy, 2, ch, chip.green ? CHIP_GRN_BD : CHIP_RED_BD);
    fb.rect(cx + cw - 2, cy, 2, ch, chip.green ? CHIP_GRN_BD : CHIP_RED_BD);
    drawText(fb, chip.label, cx + 10, cy + (ch - 14) / 2, 2, chip.green ? GREEN_BRIGHT : RED_SOFT);
    cx += cw + 8;
  }
}

function drawTower(fb: FB, x0: number, yTop: number, yBase: number): void {
  // Riyadh PIF Tower silhouette: tapering slab + spire, smoke above,
  // broken floors shown as a dark band with a red scar.
  const cx = (x0 + 500) / 2 + 8;
  // Smoke plume.
  fb.circle(cx - 22, yTop - 6, 13, SMOKE);
  fb.circle(cx + 2, yTop - 18, 17, SMOKE);
  fb.circle(cx + 26, yTop - 4, 11, SMOKE);
  fb.circle(cx - 2, yTop - 30, 10, SMOKE);
  // Spire.
  fb.line(cx, yTop + 32, cx, yTop, 3, STEEL_DARK);
  // Tower body: trapezoid, wider so the silhouette reads at a glance.
  const topL = cx - 18;
  const topR = cx + 18;
  const botL = cx - 48;
  const botR = cx + 48;
  fb.poly(
    [
      [topL, yTop + 32],
      [topR, yTop + 32],
      [botR, yBase],
      [botL, yBase],
    ],
    STEEL_DARK
  );
  // Windows: deterministic grid, some lit, some dark.
  let row = 0;
  for (let y = yTop + 44; y < yBase - 10; y += 13, row++) {
    const t = (y - (yTop + 32)) / (yBase - (yTop + 32));
    const half = 18 + t * 30;
    let col = 0;
    for (let x = Math.floor(cx - half + 6); x < cx + half - 8; x += 11, col++) {
      const broken = y >= 606 && y <= 638;
      if (broken) continue;
      const lit = (row * 7 + col * 3) % 5 === 0;
      fb.rect(x, y, 5, 7, lit ? YELLOW : STEEL);
    }
  }
  // Broken floors: dark band + red scar + a few orange embers.
  fb.rect(cx - 38, 606, 76, 32, [0x0a, 0x0e, 0x1a, 255]);
  fb.rect(cx - 38, 606, 76, 2, RED);
  fb.rect(cx - 38, 636, 76, 2, RED);
  fb.rect(cx - 20, 616, 4, 4, [0xff, 0x8c, 0x1a, 255]);
  fb.rect(cx + 8, 624, 4, 4, [0xff, 0x8c, 0x1a, 255]);
  fb.rect(cx - 2, 612, 4, 4, RED_BRIGHT);
}

function drawGlobe(fb: FB, cx: number, cy: number, r: number): void {
  // Globe with a crossed-out leaf (COP31 drops the fossil-fuel phase-out).
  fb.circle(cx, cy, r, GLOBE_FILL);
  fb.ring(cx, cy, r, 4, BLUE);
  // Meridians / parallels, chord-clipped to the circle.
  const chord = (d: number): number => Math.floor(Math.sqrt(Math.max(0, r * r - d * d)));
  for (const dy of [-30, 0, 30]) {
    const half = chord(Math.abs(dy));
    fb.rect(cx - half, cy + dy, half * 2, 2, BLUE);
  }
  for (const dx of [-28, 28]) {
    const half = chord(Math.abs(dx));
    fb.rect(cx + dx, cy - half, 2, half * 2, BLUE);
  }
  // Leaf.
  fb.ellipse(cx, cy + 2, 22, 16, GREEN);
  fb.line(cx - 20, cy + 16, cx + 22, cy - 12, 2, [0x0e, 0x1b, 0x33, 255]);
  // Red cross-out.
  fb.line(cx - 44, cy - 44, cx + 44, cy + 44, 5, RED);
  fb.line(cx + 44, cy - 44, cx - 44, cy + 44, 5, RED);
}

function drawRow2(fb: FB): void {
  const y0 = 508;
  const h = 248;
  // Left: Riyadh.
  panel(fb, 8, y0, 500, h, PANEL);
  drawText(fb, "RIYADH", 24, 524, 2, YELLOW);
  drawText(fb, "MISSILE HITS", 24, 552, 3, WHITE);
  drawText(fb, "RIYADH'S", 24, 578, 3, WHITE);
  drawText(fb, "TALLEST TOWER", 24, 604, 3, WHITE);
  const riyadhDeck = "HOUTHI STRIKE DAMAGES THE PIF TOWER, HQ OF THE SAUDI WEALTH FUND \u2014 7-8 FLOORS HIT, NO INJURIES";
  wrapText(riyadhDeck, 356, 2).forEach((ln, i) => drawText(fb, ln, 24, 644 + i * 18, 2, MUTED));
  drawTower(fb, 400, 524, 744);

  // Right: COP31.
  panel(fb, 516, y0, 500, h, PANEL);
  drawText(fb, "ANTALYA \u00b7 COP31", 532, 524, 2, YELLOW);
  drawText(fb, "COP31 DROPS", 532, 552, 3, WHITE);
  drawText(fb, "FOSSIL-FUEL", 532, 578, 3, WHITE);
  drawText(fb, "PHASE-OUT", 532, 604, 3, WHITE);
  const copDeck = "DRAFT DEAL REMOVES ANY CALL TO END FOSSIL FUELS";
  wrapText(copDeck, 356, 2).forEach((ln, i) => drawText(fb, ln, 532, 644 + i * 18, 2, MUTED));
  drawGlobe(fb, 928, 640, 66);
}

function drawRow3(fb: FB): void {
  const y0 = 764;
  const h = 188;
  // Left: Gaza.
  panel(fb, 8, y0, 500, h, PANEL);
  // Map strip with the dashed yellow line.
  fb.rect(24, 776, 468, 44, [0x13, 0x1b, 0x2e, 255]);
  fb.rect(24, 776, 468, 2, BORDER);
  fb.rect(24, 818, 468, 2, BORDER);
  fb.rect(24, 776, 2, 44, BORDER);
  fb.rect(490, 776, 2, 44, BORDER);
  fb.rect(60, 784, 90, 10, [0x1b, 0x27, 0x40, 255]);
  fb.rect(300, 788, 70, 12, [0x18, 0x22, 0x38, 255]);
  fb.rect(180, 800, 60, 8, [0x1b, 0x27, 0x40, 255]);
  for (let x = 30; x < 486; x += 26) {
    fb.rect(x, 796, 16, 4, YELLOW);
  }
  fb.triUp(150, 782, 12, 12, WHITE);
  fb.triUp(352, 782, 12, 12, WHITE);
  drawText(fb, "GAZA: TROOPS CROSS", 24, 834, 3, WHITE);
  drawText(fb, "YELLOW LINE", 24, 860, 3, WHITE);
  const gazaDeck = "FIRST INCURSION ACROSS THE CEASEFIRE BOUNDARY SINCE THE TRUCE";
  wrapText(gazaDeck, 468, 2).forEach((ln, i) => drawText(fb, ln, 24, 900 + i * 18, 2, MUTED));

  // Right: Kenya.
  panel(fb, 516, y0, 500, h, PANEL);
  // Green hospital cross.
  fb.rect(556, 792, 32, 80, GREEN);
  fb.rect(532, 816, 80, 32, GREEN);
  drawText(fb, "KENYA", 632, 786, 2, GREEN);
  drawText(fb, "KENYA: LAST EBOLA", 632, 812, 3, WHITE);
  drawText(fb, "PATIENT GOES HOME", 632, 838, 3, WHITE);
  const kenyaDeck = "DISCHARGED 37 DAYS AFTER THE FIRST CASE";
  wrapText(kenyaDeck, 368, 2).forEach((ln, i) => drawText(fb, ln, 632, 876 + i * 18, 2, MUTED));
}

function drawFooter(fb: FB): void {
  fb.rect(0, 958, 1024, 66, FOOTER_BG);
  fb.rect(0, 958, 1024, 2, BORDER);
  // Two lines, tight spacing (advance 11 at scale 2). Items shortened
  // only by dropping filler words; every fact is kept.
  drawText(
    fb,
    "UK PLEDGES 1,000+ DRONES FOR UKRAINE, \u00a3260M \u00b7 CALIFORNIA SUBPOENAS NVIDIA OVER CHINA CHIPS",
    24,
    968,
    2,
    WHITE,
    1
  );
  drawText(
    fb,
    "BUKELE SEEKS 3RD TERM IN EL SALVADOR \u00b7 TRUMP PARDONS PETE ROSE \u00b7 BRENT CRUDE $92.77",
    24,
    990,
    2,
    WHITE,
    1
  );
}

// ------------------------------------------------------------------- main
function build(): FB {
  const fb = new FB(W, H);
  fb.rect(0, 0, W, H, BG);
  drawMasthead(fb);
  drawLead(fb);
  drawRow2(fb);
  drawRow3(fb);
  drawFooter(fb);
  return fb;
}

function main(): void {
  const root = dirname(fileURLToPath(import.meta.url));
  const outDir = join(root, "output");
  mkdirSync(outDir, { recursive: true });
  const fb = build();
  const png = encodePNG(fb);
  const pngPath = join(outDir, "entry.png");
  writeFileSync(pngPath, png);
  const sha = createHash("sha256").update(png).digest("hex");
  const dossier = {
    bounty: "news-image-20261120",
    title: "RED FRIDAY",
    date: "FRIDAY, 20 NOVEMBER 2026",
    image: "entry.png",
    width: W,
    height: H,
    entry_png_sha256: sha,
    entry_png_bytes: png.length,
    stories: [
      {
        slot: "lead",
        headline: "THE AI SELL-OFF GOES GLOBAL",
        facts: "Nikkei -4.8% to 56,594.94 (seven-month low); Kospi -5.2%; Taiwan Taiex -6% (worst week since 1991, -16%); Hang Seng near bear market; SoftBank -14.6%, Kioxia -11.3%, Advantest -10.6%; Nasdaq -2.3% (23,879.20), S&P 500 -2% (7,176), fifth straight day of losses; Anthropic record $81.3bn IPO opened $111.50 vs $83 offer, closed +17% at $97.17.",
      },
      {
        slot: "secondary-left",
        headline: "MISSILE HITS RIYADH'S TALLEST TOWER",
        facts: "Houthi missile damaged the PIF Tower, Riyadh's tallest skyscraper, 80 floors, HQ of the Saudi sovereign wealth fund. Windows blown out across 7-8 floors, metal facade bent, no injuries; King Abdullah Financial District evacuated. Strike Thursday evening; second such hit on the district in under two weeks (after the Aramco building on 8 Nov).",
      },
      {
        slot: "secondary-right",
        headline: "COP31 DROPS FOSSIL-FUEL PHASE-OUT",
        facts: "COP31 in Antalya, Turkey: the draft deal drops any call to phase out fossil fuels.",
      },
      {
        slot: "third-left",
        headline: "GAZA: TROOPS CROSS YELLOW LINE",
        facts: "Israeli forces cross the Yellow Line in central Gaza, first incursion across the ceasefire boundary since the truce.",
      },
      {
        slot: "third-right",
        headline: "KENYA: LAST EBOLA PATIENT GOES HOME",
        facts: "Last Ebola patient discharged, 37 days after the first case.",
      },
      {
        slot: "footer-ticker",
        headline: "UK pledges 1,000+ drones for Ukraine in a 260m-pound package; California subpoenas Nvidia over China chips; Bukele registers for a third term in El Salvador; Trump posthumously pardons baseball legend Pete Rose; Brent crude $92.77.",
        facts: "Ticker items shortened only by dropping filler words on the image; full wording kept here.",
      },
    ],
    notes:
      "All facts verified live for the 20 November 2026 news cycle (see DESIGN.md). " +
      "Image drawn entirely in code: embedded 5x7 bitmap letterforms, no fonts, no network, no external files. " +
      "Deterministic: fixed date string, no clock, no randomness; repeated runs write identical bytes.",
  };
  writeFileSync(join(outDir, "dossier.json"), JSON.stringify(dossier, null, 2) + "\n");
  console.log(`entry.png: ${png.length} bytes, sha256 ${sha}`);
  console.log(`dossier.json written to ${join(outDir, "dossier.json")}`);
}

main();
