import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  // Fishbowl (circle)
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0f3460';
  ctx.fill();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  // Fish
  const fishX = cx;
  const fishY = cy;
  const fishSize = size * 0.18;

  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.ellipse(fishX, fishY, fishSize, fishSize * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fish tail
  ctx.beginPath();
  ctx.moveTo(fishX + fishSize * 0.8, fishY);
  ctx.lineTo(fishX + fishSize * 1.4, fishY - fishSize * 0.4);
  ctx.lineTo(fishX + fishSize * 1.4, fishY + fishSize * 0.4);
  ctx.closePath();
  ctx.fill();

  // Fish eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(fishX - fishSize * 0.4, fishY - fishSize * 0.1, fishSize * 0.15, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

writeFileSync('static/icon-192.png', generateIcon(192));
writeFileSync('static/icon-512.png', generateIcon(512));

console.log('Icons generated: static/icon-192.png, static/icon-512.png');
