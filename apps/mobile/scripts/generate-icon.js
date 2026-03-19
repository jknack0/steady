/**
 * Generate app icon and splash screen assets for Steady with ADHD.
 *
 * Requirements:
 *   npm install canvas (dev dependency, run from apps/mobile)
 *
 * Usage:
 *   node scripts/generate-icon.js
 *
 * Generates:
 *   assets/icon.png          - 1024x1024 app icon
 *   assets/adaptive-icon.png - 1024x1024 Android adaptive icon (foreground)
 *   assets/splash-icon.png   - 200x200 splash screen icon
 *   assets/notification-icon.png - 96x96 notification icon
 *
 * Design:
 *   - Indigo (#6366f1) background with rounded corners
 *   - White pulse/heartbeat icon
 *   - "S" lettermark
 */

let createCanvas;
try {
  createCanvas = require("canvas").createCanvas;
} catch {
  console.log("Canvas not installed. Install with: npm install --save-dev canvas");
  console.log("Then run: node scripts/generate-icon.js");
  console.log("");
  console.log("Alternatively, create these files manually:");
  console.log("  assets/icon.png          - 1024x1024 app icon (indigo bg, white S)");
  console.log("  assets/adaptive-icon.png - 1024x1024 foreground for Android");
  console.log("  assets/splash-icon.png   - 200x200 splash screen centered icon");
  console.log("  assets/notification-icon.png - 96x96 notification icon (white on transparent)");
  process.exit(0);
}

const fs = require("fs");
const path = require("path");

const INDIGO = "#6366f1";
const WHITE = "#ffffff";
const assetsDir = path.join(__dirname, "..", "assets");

function drawPulse(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = size * 0.06;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const w = size * 0.6;
  const h = size * 0.35;
  const startX = cx - w / 2;

  ctx.moveTo(startX, cy);
  ctx.lineTo(startX + w * 0.2, cy);
  ctx.lineTo(startX + w * 0.3, cy - h);
  ctx.lineTo(startX + w * 0.45, cy + h * 0.5);
  ctx.lineTo(startX + w * 0.55, cy - h * 0.3);
  ctx.lineTo(startX + w * 0.65, cy);
  ctx.lineTo(startX + w, cy);
  ctx.stroke();
}

function generateIcon(size, filename, rounded = true) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  if (rounded) {
    const r = size * 0.22;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    ctx.fillStyle = INDIGO;
    ctx.fill();
  } else {
    ctx.fillStyle = INDIGO;
    ctx.fillRect(0, 0, size, size);
  }

  // Pulse icon
  drawPulse(ctx, size / 2, size / 2, size);

  // Letter S below pulse
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.font = `bold ${size * 0.15}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STEADY", size / 2, size * 0.78);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(assetsDir, filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

function generateNotificationIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Transparent background, white icon
  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = size / 2;
  const cy = size / 2;
  const w = size * 0.7;
  const h = size * 0.4;
  const startX = cx - w / 2;

  ctx.moveTo(startX, cy);
  ctx.lineTo(startX + w * 0.2, cy);
  ctx.lineTo(startX + w * 0.3, cy - h);
  ctx.lineTo(startX + w * 0.45, cy + h * 0.5);
  ctx.lineTo(startX + w * 0.55, cy - h * 0.3);
  ctx.lineTo(startX + w * 0.65, cy);
  ctx.lineTo(startX + w, cy);
  ctx.stroke();

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(assetsDir, filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

// Generate all icons
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

generateIcon(1024, "icon.png", true);
generateIcon(1024, "adaptive-icon.png", false);
generateIcon(200, "splash-icon.png", true);
generateNotificationIcon(96, "notification-icon.png");

console.log("\nDone! Update app.json icon/splash paths if needed.");
