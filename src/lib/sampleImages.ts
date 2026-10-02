/**
 * Built-in retro sample graphics
 * Generated programmatically to ensure instant offline availability
 */

export interface SampleImage {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  dataUrl: string;
}

function drawSpaceship(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Deep space background
  ctx.fillStyle = '#060814';
  ctx.fillRect(0, 0, w, h);

  // Stars
  ctx.fillStyle = '#ffffff';
  const starPositions = [
    [10, 15], [35, 8], [80, 25], [120, 10], [150, 40], [20, 80],
    [140, 90], [60, 110], [105, 120], [30, 140], [130, 150]
  ];
  for (const [sx, sy] of starPositions) {
    ctx.fillRect((sx * w) / 160, (sy * h) / 160, 2, 2);
  }

  // Spaceship center coordinates
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  // Thruster flames
  ctx.fillStyle = '#ff5500';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 24);
  ctx.lineTo(cx, cy + 42);
  ctx.lineTo(cx + 8, cy + 24);
  ctx.fill();

  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 24);
  ctx.lineTo(cx, cy + 34);
  ctx.lineTo(cx + 4, cy + 24);
  ctx.fill();

  // Ship body (Metallic blue/gray)
  ctx.fillStyle = '#2b4470';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 35);
  ctx.lineTo(cx + 18, cy + 20);
  ctx.lineTo(cx + 10, cy + 24);
  ctx.lineTo(cx - 10, cy + 24);
  ctx.lineTo(cx - 18, cy + 20);
  ctx.closePath();
  ctx.fill();

  // Ship wings
  ctx.fillStyle = '#a82020';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy);
  ctx.lineTo(cx - 36, cy + 26);
  ctx.lineTo(cx - 14, cy + 22);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 14, cy);
  ctx.lineTo(cx + 36, cy + 26);
  ctx.lineTo(cx + 14, cy + 22);
  ctx.fill();

  // Cockpit canopy (Cyan glass)
  ctx.fillStyle = '#00ffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, 6, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cy - 14, 2, 6); // highlight
}

function drawCastleLandscape(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sky gradient (DOS EGA style cyan to dark blue)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  skyGrad.addColorStop(0, '#0000aa');
  skyGrad.addColorStop(0.5, '#00aaaa');
  skyGrad.addColorStop(1, '#55ffff');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Distant mountains
  ctx.fillStyle = '#0055aa';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.65);
  ctx.lineTo(w * 0.25, h * 0.35);
  ctx.lineTo(w * 0.55, h * 0.65);
  ctx.lineTo(w * 0.8, h * 0.38);
  ctx.lineTo(w, h * 0.65);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Castle rock hill
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.75, w * 0.38, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Castle walls
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(w * 0.38, h * 0.42, w * 0.24, h * 0.24);

  // Left tower
  ctx.fillRect(w * 0.34, h * 0.34, w * 0.08, h * 0.32);
  ctx.fillStyle = '#aa0000';
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.34);
  ctx.lineTo(w * 0.38, h * 0.24);
  ctx.lineTo(w * 0.44, h * 0.34);
  ctx.fill();

  // Right tower
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(w * 0.58, h * 0.34, w * 0.08, h * 0.32);
  ctx.fillStyle = '#aa0000';
  ctx.beginPath();
  ctx.moveTo(w * 0.56, h * 0.34);
  ctx.lineTo(w * 0.62, h * 0.24);
  ctx.lineTo(w * 0.68, h * 0.34);
  ctx.fill();

  // Castle Gate
  ctx.fillStyle = '#552200';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.66, w * 0.04, Math.PI, 0);
  ctx.lineTo(w * 0.54, h * 0.66);
  ctx.lineTo(w * 0.46, h * 0.66);
  ctx.fill();

  // Water moat / river
  ctx.fillStyle = '#0000aa';
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
  ctx.fillStyle = '#00aaaa';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect((i * w) / 6, h * 0.88, w * 0.1, 2);
  }
}

function drawRetroSunset(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Synthwave / VGA Sunset
  const bg = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  bg.addColorStop(0, '#100028');
  bg.addColorStop(0.4, '#3b005e');
  bg.addColorStop(0.7, '#88006e');
  bg.addColorStop(1, '#ff3366');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Big Sun with horizontal scanline slits
  const sunY = h * 0.45;
  const sunR = Math.min(w, h) * 0.28;
  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, '#ffff00');
  sunGrad.addColorStop(1, '#ff0055');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w * 0.5, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Sun horizontal blind slits
  ctx.fillStyle = '#ff3366';
  for (let y = sunY; y < sunY + sunR; y += 5) {
    const thickness = Math.floor((y - sunY) / 6) + 1;
    ctx.fillRect(w * 0.5 - sunR, y, sunR * 2, thickness);
  }

  // Horizon line
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(0, h * 0.65, w, 2);

  // Perspective 3D Grid ground
  ctx.fillStyle = '#090014';
  ctx.fillRect(0, h * 0.65 + 2, w, h * 0.35);

  ctx.strokeStyle = '#aa00ff';
  ctx.lineWidth = 1;
  // Perspective lines
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.65);
    ctx.lineTo(w * 0.5 + i * (w * 0.12), h);
    ctx.stroke();
  }
  // Horizontal grid lines with perspective spacing
  for (let i = 1; i <= 9; i++) {
    const gy = h * 0.65 + (i * i * (h * 0.35)) / 81;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
}

function drawPixelHero(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#1e1a2e';
  ctx.fillRect(0, 0, w, h);

  // 16x16 Pixel Hero scaled up
  const pixelMap = [
    '....RRRRRR......',
    '....RRRRRR......',
    '...RWWWWWW......',
    '..RWSFSFWW......',
    '..RWSFSFWW......',
    '..RSSSSSSW......',
    '...SSSSSS.......',
    '...SMMMM........',
    '..BBBBBBBB......',
    '.GBBBBBBBBGG....',
    '.GBBBBBBBBGG....',
    '.GGBBBBBBG......',
    '...YYYYYY.......',
    '...YY..YY.......',
    '...DD..DD.......',
    '..DDD..DDD......',
  ];

  const colorMap: Record<string, string> = {
    R: '#c42c2c',
    W: '#ffffff',
    S: '#ffb380',
    F: '#2e1c12',
    M: '#b34700',
    B: '#2c5ec4',
    G: '#ffcc00',
    Y: '#3d3460',
    D: '#1a1429',
  };

  const pxSize = Math.floor(Math.min(w, h) / 18);
  const startX = Math.floor((w - 16 * pxSize) / 2);
  const startY = Math.floor((h - 16 * pxSize) / 2);

  for (let row = 0; row < pixelMap.length; row++) {
    const line = pixelMap[row];
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      if (colorMap[char]) {
        ctx.fillStyle = colorMap[char];
        ctx.fillRect(startX + col * pxSize, startY + row * pxSize, pxSize, pxSize);
      }
    }
  }
}

export function createSampleImage(id: string): SampleImage {
  const canvas = document.createElement('canvas');
  let name = '';
  let category = '';
  let w = 320;
  let h = 200;

  switch (id) {
    case 'spaceship':
      name = 'Cyber Starfighter';
      category = 'Arcade Sprite';
      w = 160;
      h = 160;
      canvas.width = w;
      canvas.height = h;
      drawSpaceship(canvas.getContext('2d')!, w, h);
      break;

    case 'castle':
      name = 'Sierra Quest Castle';
      category = 'DOS Adventure';
      w = 320;
      h = 200;
      canvas.width = w;
      canvas.height = h;
      drawCastleLandscape(canvas.getContext('2d')!, w, h);
      break;

    case 'sunset':
      name = 'VGA Synth Sunset';
      category = 'SCREEN 13 Art';
      w = 320;
      h = 200;
      canvas.width = w;
      canvas.height = h;
      drawRetroSunset(canvas.getContext('2d')!, w, h);
      break;

    case 'hero':
    default:
      name = '16-Bit Pixel Knight';
      category = 'Game Character';
      w = 64;
      h = 64;
      canvas.width = w;
      canvas.height = h;
      drawPixelHero(canvas.getContext('2d')!, w, h);
      break;
  }

  return {
    id,
    name,
    category,
    width: w,
    height: h,
    dataUrl: canvas.toDataURL('image/png'),
  };
}

export const SAMPLE_PRESETS: { id: string; name: string; category: string }[] = [
  { id: 'spaceship', name: 'Cyber Starfighter', category: 'Sprite' },
  { id: 'castle', name: 'Sierra Quest Castle', category: '16-Color Adventure' },
  { id: 'sunset', name: 'VGA Synth Sunset', category: '256-Color Scene' },
  { id: 'hero', name: 'Pixel Knight', category: 'Character' },
];
