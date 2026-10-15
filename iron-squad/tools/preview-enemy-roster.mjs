// IRON SQUAD - Enemy Art Roster Preview Tool
// Generates visual inspection sheets for 22 new biome-specific enemy types using Playwright.
// Outputs:
//   1. docs/validation/enemy-art-roster/roster-day.png (Daytime palette, 3 variants per mob + labels)
//   2. docs/validation/enemy-art-roster/roster-night.png (Nighttime palette, emissive/flash check)
//   3. docs/validation/enemy-art-roster/roster-scale-390.png (1:1 actual game scale in 390px viewport)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.resolve(ROOT_DIR, 'iron-squad/docs/validation/enemy-art-roster');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Minimal static HTTP server so ES modules can be loaded via http://localhost:port
function createStaticServer() {
  return http.createServer((req, res) => {
    const rawPath = req.url.split('?')[0].replace(/^\/+/, '');
    const safePath = path.normalize(path.join(ROOT_DIR, rawPath));

    if (!safePath.startsWith(ROOT_DIR)) {
      res.statusCode = 403;
      return res.end('Forbidden');
    }

    if (rawPath === '' || rawPath === 'index.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
    }

    if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      res.statusCode = 404;
      return res.end('Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const mimeTypes = {
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.png': 'image/png'
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    fs.createReadStream(safePath).pipe(res);
  });
}

async function renderRosterSheet(page, port, isNight) {
  return await page.evaluate(async ({ isNight }) => {
    const { ENEMY_ROSTER, drawEnemyArt } = await import('/iron-squad/js/enemy-art.js');

    const width = 1140;
    const padding = 20;
    const colCount = 2;
    const cardW = 540;
    const cardH = 136;
    const gapX = 20;
    const gapY = 16;
    const headerH = 92;

    const rowCount = Math.ceil(ENEMY_ROSTER.length / colCount);
    const height = headerH + rowCount * (cardH + gapY) + padding;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext('2d');

    // Theme colors
    const bg = isNight ? '#0d151c' : '#ece7dc';
    const cardBg = isNight ? '#15212b' : '#f7f4ec';
    const cardBorder = isNight ? '#253545' : '#d2cbba';
    const textMain = isNight ? '#e8edf0' : '#232b2f';
    const textSub = isNight ? '#94a4b0' : '#6b726d';
    const textTag = isNight ? '#729cb5' : '#8a6e4d';
    const shadowColor = isNight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.18)';
    const groundColor = isNight ? '#121d26' : '#ded9cb';

    // Canvas background
    c.fillStyle = bg;
    c.fillRect(0, 0, width, height);

    // Header banner
    c.fillStyle = isNight ? '#131e28' : '#e0dbce';
    c.fillRect(0, 0, width, headerH - 12);
    c.fillStyle = isNight ? '#4da2d8' : '#9c6634';
    c.fillRect(0, headerH - 16, width, 4);

    c.fillStyle = textMain;
    c.font = 'bold 22px system-ui, -apple-system, sans-serif';
    c.fillText(
      isNight ? 'IRON SQUAD - 新規敵キャラクター名簿（夜間環境・全22種）' : 'IRON SQUAD - 新規敵キャラクター名簿（昼間環境・全22種）',
      padding + 10,
      38
    );

    c.fillStyle = textSub;
    c.font = '13px system-ui, -apple-system, sans-serif';
    c.fillText(
      '各カード表示： 左＝通常状態 / 中央＝被弾点滅(hitPulse:1) / 右＝左向き(facingAngle:π) ＋ 下部：接地影・識別メタデータ',
      padding + 10,
      64
    );

    // Draw cards for each mob
    const now = 2400;

    ENEMY_ROSTER.forEach((entry, idx) => {
      const col = idx % colCount;
      const row = Math.floor(idx / colCount);
      const cardX = padding + col * (cardW + gapX);
      const cardY = headerH + row * (cardH + gapY);

      // Card container
      c.fillStyle = cardBg;
      c.strokeStyle = cardBorder;
      c.lineWidth = 1.2;
      c.beginPath();
      c.roundRect(cardX, cardY, cardW, cardH, 8);
      c.fill();
      c.stroke();

      // Sprite preview arena (left 260px)
      const arenaW = 260;
      c.fillStyle = groundColor;
      c.beginPath();
      c.roundRect(cardX + 8, cardY + 8, arenaW, cardH - 16, 6);
      c.fill();

      // State column labels in arena
      c.fillStyle = textSub;
      c.font = '10px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('通常', cardX + 8 + 44, cardY + 22);
      c.fillText('被弾点滅', cardX + 8 + 130, cardY + 22);
      c.fillText('左向き', cardX + 8 + 216, cardY + 22);

      // Draw 3 instances: normal, flashing, facing-left
      const previewScale = 1.55;
      const baseGroundY = cardY + cardH - 24;

      const instances = [
        { cx: cardX + 8 + 44, facing: 0, flash: 0 },
        { cx: cardX + 8 + 130, facing: 0, flash: 1 },
        { cx: cardX + 8 + 216, facing: Math.PI, flash: 0 }
      ];

      for (const inst of instances) {
        // Ground shadow
        c.fillStyle = shadowColor;
        c.beginPath();
        c.ellipse(inst.cx, baseGroundY, entry.radius * previewScale * 0.75, 4.5, 0, 0, Math.PI * 2);
        c.fill();

        // Mob sprite
        c.save();
        c.translate(inst.cx, baseGroundY);
        c.scale(previewScale, previewScale);
        drawEnemyArt(
          c,
          {
            type: entry.id,
            radius: entry.radius,
            x: inst.cx,
            y: baseGroundY,
            facingAngle: inst.facing,
            hitPulse: inst.flash
          },
          now
        );
        c.restore();
      }

      // Metadata section (right 250px)
      c.textAlign = 'left';

      // Biome Tag
      c.fillStyle = textTag;
      c.font = 'bold 11px system-ui, sans-serif';
      c.fillText(entry.region.toUpperCase(), cardX + arenaW + 20, cardY + 26);

      // Mob Name
      c.fillStyle = textMain;
      c.font = 'bold 16px system-ui, -apple-system, sans-serif';
      c.fillText(entry.name, cardX + arenaW + 20, cardY + 48);

      // Identifier and radius
      c.fillStyle = isNight ? '#6fa8dc' : '#457299';
      c.font = '12px monospace';
      c.fillText(`id: ${entry.id} (r=${entry.radius})`, cardX + arenaW + 20, cardY + 70);

      // Feature description
      c.fillStyle = textSub;
      c.font = '12px system-ui, sans-serif';
      c.fillText(entry.desc, cardX + arenaW + 20, cardY + 95);
    });

    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.appendChild(canvas);

    return { width, height };
  }, { isNight });
}

async function renderScale390(page, port) {
  return await page.evaluate(async () => {
    const { ENEMY_ROSTER, drawEnemyArt } = await import('/iron-squad/js/enemy-art.js');

    const width = 390;
    const padding = 12;

    // Group mobs by region
    const groups = [];
    for (const mob of ENEMY_ROSTER) {
      let g = groups.find(x => x.region === mob.region);
      if (!g) {
        g = { region: mob.region, mobs: [] };
        groups.push(g);
      }
      g.mobs.push(mob);
    }

    const sectionH = 148;
    const headerH = 76;
    const height = headerH + groups.length * sectionH + 20;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext('2d');

    // Background
    c.fillStyle = '#222d36';
    c.fillRect(0, 0, width, height);

    // Title
    c.fillStyle = '#f0ebe1';
    c.font = 'bold 16px system-ui, sans-serif';
    c.fillText('IRON SQUAD / 実寸見本 (390px幅)', padding, 28);
    c.fillStyle = '#9cb0bd';
    c.font = '11px system-ui, sans-serif';
    c.fillText('scale=1.0（等倍実寸）。スマホ画面で各敵の視認性と特徴を検証', padding, 48);

    const now = 2400;
    let curY = headerH;

    for (const group of groups) {
      c.textAlign = 'left';

      // Biome band
      c.fillStyle = '#1b242b';
      c.fillRect(padding, curY, width - padding * 2, sectionH - 12);
      c.strokeStyle = '#2e3e4a';
      c.lineWidth = 1;
      c.strokeRect(padding, curY, width - padding * 2, sectionH - 12);

      // Biome label
      c.fillStyle = '#e5c07b';
      c.font = 'bold 12px system-ui, sans-serif';
      c.fillText(`【${group.region}】`, padding + 12, curY + 22);

      // Ground line inside section
      const groundY = curY + sectionH - 36;
      c.strokeStyle = 'rgba(255,255,255,0.08)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(padding + 10, groundY);
      c.lineTo(width - padding - 10, groundY);
      c.stroke();

      // Distribute mobs across section width
      const count = group.mobs.length;
      const slotW = (width - padding * 2 - 20) / count;

      group.mobs.forEach((mob, mIdx) => {
        const cx = padding + 10 + slotW * (mIdx + 0.5);

        // Ground shadow
        c.fillStyle = 'rgba(0,0,0,0.45)';
        c.beginPath();
        c.ellipse(cx, groundY, mob.radius * 0.75, 3.5, 0, 0, Math.PI * 2);
        c.fill();

        // 1:1 Sprite
        c.save();
        c.translate(cx, groundY);
        drawEnemyArt(c, { type: mob.id, radius: mob.radius, x: cx, y: groundY, facingAngle: 0, hitPulse: 0 }, now);
        c.restore();

        // Short Name
        c.fillStyle = '#c7d5df';
        c.font = '10px system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText(mob.name, cx, groundY + 16);
      });

      curY += sectionH;
    }

    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.appendChild(canvas);

    return { width, height };
  });
}

async function main() {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Local preview server listening on port ${port}`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    const page = await browser.newPage();

    // 1. Daytime Roster (roster-day.png)
    console.log('Rendering roster-day.png...');
    await page.goto(`http://localhost:${port}/`);
    const dayDims = await renderRosterSheet(page, port, false);
    await page.setViewportSize(dayDims);
    const dayCanvas = page.locator('canvas');
    const dayPath = path.join(OUT_DIR, 'roster-day.png');
    await dayCanvas.screenshot({ path: dayPath });
    console.log(`Saved: ${dayPath}`);

    // 2. Nighttime Roster (roster-night.png)
    console.log('Rendering roster-night.png...');
    await page.goto(`http://localhost:${port}/`);
    const nightDims = await renderRosterSheet(page, port, true);
    await page.setViewportSize(nightDims);
    const nightCanvas = page.locator('canvas');
    const nightPath = path.join(OUT_DIR, 'roster-night.png');
    await nightCanvas.screenshot({ path: nightPath });
    console.log(`Saved: ${nightPath}`);

    // 3. 390px Scale Sample (roster-scale-390.png)
    console.log('Rendering roster-scale-390.png...');
    await page.goto(`http://localhost:${port}/`);
    const scaleDims = await renderScale390(page, port);
    await page.setViewportSize(scaleDims);
    const scaleCanvas = page.locator('canvas');
    const scalePath = path.join(OUT_DIR, 'roster-scale-390.png');
    await scaleCanvas.screenshot({ path: scalePath });
    console.log(`Saved: ${scalePath}`);

    console.log('All 3 preview images generated successfully.');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error('Preview generation failed:', err);
  process.exit(1);
});
