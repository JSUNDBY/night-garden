// ============================================================
// NIGHT GARDEN II — Psychedelic bioluminescent ecosystem
// ============================================================
// A living garden of fractal plants, sacred geometry flowers,
// pulsing mycelium networks, swarming fireflies, aurora sky,
// and energy that flows between all living things.
// Click/tap to enter. Shift+F or double-click for fullscreen.
// Mouse creates wind + attracts fireflies.
// Click to plant new life with a burst of energy.
// ============================================================

// ===== CONFIG =====
const MAX_PLANTS = 14;
const MAX_FLOWERS = 10;
const MAX_MUSHROOMS = 8;
const MAX_FIREFLIES = 80;
const MAX_MOTHS = 5;
const MAX_ENERGY_VEINS = 12;

const SCALE_NOTES = [38, 42, 45, 50, 54, 57, 62, 66, 69];
const PALETTES = [
  { base: 280, spread: 70 },   // deep purple-violet
  { base: 160, spread: 60 },   // teal-cyan
  { base: 320, spread: 50 },   // hot magenta
  { base: 200, spread: 60 },   // electric blue
  { base: 80, spread: 50 },    // acid green
  { base: 30, spread: 60 },    // flame amber
  { base: 0, spread: 360 },    // full spectrum
];

// ===== STATE =====
let plants = [];
let flowers = [];
let mushrooms = [];
let fireflies = [];
let moths = [];
let pollen = [];
let energyVeins = [];
let bgStars = [];
let shootingStars = [];
let auroraLayers = [];
let treeline = [];
let groundLine = [];
let trailBuffer;

let windX = 0, windY = 0;
let targetWindX = 0, targetWindY = 0;
let globalTime = 0;
let spawnTimer = 0;
let hueShift = 0; // global slow hue rotation

// Audio
let audioCtx, masterGain, compressor, dryGain, wetGain;
let delayNode, delayFeedback, delayFilter, delayGain;
let audioReady = false;
let voices = new Map();
let awaitingClick = true;
let lastMouseX = 0, lastMouseY = 0;

// ===== SETUP =====
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  angleMode(RADIANS);
  noCursor();
  textFont('monospace');

  trailBuffer = createGraphics(width, height);
  trailBuffer.colorMode(HSB, 360, 100, 100, 100);

  initStars();
  initAurora();
  generateTreeline();
  generateGround();

  function startGarden() {
    if (!awaitingClick) return;
    awaitingClick = false;
    try { initAudio(); } catch (e) { console.error('Audio init error:', e); }
    for (let i = 0; i < 6; i++) spawnPlant();
    for (let i = 0; i < 4; i++) spawnFlower();
    for (let i = 0; i < 3; i++) spawnMushroom();
    for (let i = 0; i < 40; i++) spawnFirefly();
    for (let i = 0; i < 3; i++) spawnMoth();
    for (let i = 0; i < 4; i++) spawnEnergyVein();
  }

  document.addEventListener('touchstart', startGarden, { passive: true });
  document.addEventListener('touchend', startGarden, { passive: true });
  document.addEventListener('click', startGarden);
  document.addEventListener('pointerdown', startGarden);
}

// ===== STARS =====
function initStars() {
  bgStars = [];
  for (let i = 0; i < 400; i++) {
    bgStars.push({
      x: random(width), y: random(height * 0.78),
      size: random(0.3, 3),
      phase: random(TWO_PI),
      twinkleSpeed: random(0.005, 0.035),
      hueVal: random() < 0.5 ? 0 : random([210, 30, 350, 60, 180, 280]),
      sat: random() < 0.5 ? 0 : random(20, 60),
      brightness: random(55, 100),
      baseAlpha: random(15, 60),
    });
  }
}

function drawStars() {
  noStroke();
  for (let s of bgStars) {
    let twinkle = sin(frameCount * s.twinkleSpeed + s.phase) * 0.45 + 0.55;
    let a = s.baseAlpha * twinkle;
    let h = (s.hueVal + hueShift * 0.1) % 360;
    fill(h, s.sat, s.brightness, a);
    ellipse(s.x, s.y, s.size);
    if (s.size > 1.8) {
      fill(h, s.sat * 0.4, s.brightness, a * 0.15);
      ellipse(s.x, s.y, s.size * 5);
    }
  }
}

// ===== AURORA — more psychedelic, hue-shifting =====
function initAurora() {
  auroraLayers = [];
  for (let i = 0; i < 6; i++) {
    auroraLayers.push({
      baseHue: random(360),
      yBase: random(0.04, 0.3),
      amplitude: random(0.03, 0.08),
      noiseOff: random(1000),
      speed: random(0.0004, 0.0015),
      alpha: random(4, 12),
      thickness: random(0.03, 0.12),
      hueSpeed: random(0.05, 0.2), // hue cycling speed
    });
  }
}

function drawAurora() {
  noStroke();
  for (let layer of auroraLayers) {
    let yCenter = layer.yBase * height;
    let thick = layer.thickness * height;
    let layerHue = (layer.baseHue + hueShift * layer.hueSpeed) % 360;
    for (let x = 0; x < width; x += 3) {
      let n = noise(layer.noiseOff + x * 0.0015, globalTime * layer.speed * 800);
      let yOff = (n - 0.5) * layer.amplitude * height;
      let shimmer = noise(layer.noiseOff + 500 + x * 0.004, globalTime * layer.speed * 1500);
      let a = layer.alpha * (0.4 + shimmer * 0.6);
      // Rainbow banding across the aurora
      let h = (layerHue + x * 0.05 + (n - 0.5) * 60 + 360) % 360;
      fill(h, 65, 90, a);
      rect(x, yCenter + yOff - thick / 2, 4, thick);
    }
  }
}

// ===== SHOOTING STARS =====
function updateShootingStars() {
  if (random() < 0.001) {
    let dir = random() > 0.5 ? 1 : -1;
    shootingStars.push({
      x: dir > 0 ? random(width * 0.05, width * 0.5) : random(width * 0.5, width * 0.95),
      y: random(height * 0.03, height * 0.35),
      angle: random(PI * 0.05, PI * 0.35) * dir + (dir < 0 ? PI : 0),
      speed: random(8, 25),
      life: 1.0,
      decay: random(0.01, 0.035),
      len: random(50, 160),
      hueVal: random([0, 200, 40, 180, 280, 320]),
    });
  }
  noFill();
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    let ss = shootingStars[i];
    ss.x += cos(ss.angle) * ss.speed;
    ss.y += sin(ss.angle) * ss.speed;
    ss.life -= ss.decay;
    if (ss.life <= 0) { shootingStars.splice(i, 1); continue; }
    let tailX = ss.x - cos(ss.angle) * ss.len * ss.life;
    let tailY = ss.y - sin(ss.angle) * ss.len * ss.life;
    // Rainbow trail
    for (let s = 0; s < 5; s++) {
      let t = s / 5;
      let px = lerp(ss.x, tailX, t);
      let py = lerp(ss.y, tailY, t);
      let h = (ss.hueVal + t * 60 + hueShift * 0.3) % 360;
      strokeWeight(map(t, 0, 1, 2, 0.3));
      stroke(h, 30, 100, ss.life * map(t, 0, 1, 70, 10));
      point(px, py);
    }
    strokeWeight(1.8);
    stroke(ss.hueVal, 10, 100, ss.life * 80);
    line(ss.x, ss.y, lerp(ss.x, tailX, 0.1), lerp(ss.y, tailY, 0.1));
    strokeWeight(0.6);
    stroke(ss.hueVal, 10, 100, ss.life * 25);
    line(lerp(ss.x, tailX, 0.1), lerp(ss.y, tailY, 0.1), tailX, tailY);
    noStroke();
    fill(ss.hueVal, 10, 100, ss.life * 25);
    ellipse(ss.x, ss.y, 5);
  }
}

// ===== TREELINE =====
function generateTreeline() {
  treeline = [];
  let layers = [
    { yBase: 0.88, heightMin: 0.05, heightMax: 0.14, alpha: 95, detail: 0.006 },
    { yBase: 0.84, heightMin: 0.06, heightMax: 0.18, alpha: 70, detail: 0.004 },
    { yBase: 0.80, heightMin: 0.04, heightMax: 0.12, alpha: 45, detail: 0.003 },
  ];
  for (let layer of layers) {
    let points = [];
    let noiseOff = random(1000);
    for (let x = -10; x <= width + 10; x += 3) {
      let hill = noise(noiseOff + x * layer.detail) * (layer.heightMax - layer.heightMin) + layer.heightMin;
      let crowns = noise(noiseOff + 500 + x * 0.03) * 0.04;
      let fine = noise(noiseOff + 1000 + x * 0.08) * 0.015;
      let spike = 0;
      if (noise(noiseOff + 2000 + x * 0.015) > 0.6) spike = noise(noiseOff + 3000 + x * 0.06) * 0.06;
      points.push({ x, y: (layer.yBase - hill - crowns - fine - spike) * height });
    }
    treeline.push({ points, alpha: layer.alpha });
  }
}

function drawTreeline() {
  noStroke();
  for (let i = treeline.length - 1; i >= 0; i--) {
    let layer = treeline[i];
    fill(180, 15, 3, layer.alpha);
    beginShape();
    vertex(0, height);
    for (let p of layer.points) vertex(p.x, p.y);
    vertex(width, height);
    endShape(CLOSE);
  }
}

// ===== GROUND =====
function generateGround() {
  groundLine = [];
  let noiseOff = random(1000);
  for (let x = -10; x <= width + 10; x += 2) {
    groundLine.push({ x, y: height * 0.88 + noise(noiseOff + x * 0.005) * height * 0.03 });
  }
}

function getGroundY(px) {
  for (let i = 0; i < groundLine.length - 1; i++) {
    if (groundLine[i].x <= px && groundLine[i + 1].x > px) {
      let t = (px - groundLine[i].x) / (groundLine[i + 1].x - groundLine[i].x);
      return lerp(groundLine[i].y, groundLine[i + 1].y, t);
    }
  }
  return height * 0.88;
}

function drawGround() {
  noStroke();
  fill(160, 20, 4, 100);
  beginShape();
  vertex(0, height);
  for (let p of groundLine) vertex(p.x, p.y);
  vertex(width, height);
  endShape(CLOSE);

  // Pulsing bioluminescent moss line
  for (let i = 0; i < groundLine.length; i += 2) {
    let p = groundLine[i];
    let glow = noise(p.x * 0.008, globalTime * 0.4) * 0.6 + 0.4;
    let pulse = sin(frameCount * 0.008 + p.x * 0.01) * 0.3 + 0.7;
    let h = (120 + noise(p.x * 0.003, globalTime * 0.2) * 80 + hueShift * 0.15) % 360;
    fill(h, 60, 50, glow * pulse * 10);
    ellipse(p.x, p.y, random(4, 12), 3);
    // Stronger glow spots
    if (noise(p.x * 0.02 + 500, globalTime * 0.3) > 0.7) {
      fill(h, 40, 90, glow * pulse * 6);
      ellipse(p.x, p.y, 15, 5);
    }
  }
}

// ===== ENERGY VEIN — mycelium network pulsing underground =====
class EnergyVein {
  constructor() {
    this.startX = random(width);
    this.points = [];
    let x = this.startX;
    let baseY = getGroundY(x);
    let len = Math.floor(random(8, 20));
    for (let i = 0; i < len; i++) {
      x += random(-40, 40);
      x = constrain(x, 10, width - 10);
      let y = getGroundY(x) + random(5, 30);
      this.points.push({ x, y });
    }
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-20, 20) + 360) % 360;
    this.phase = random(TWO_PI);
    this.pulseSpeed = random(0.008, 0.02);
    this.alive = true;
    this.age = 0;
    this.lifespan = random(1500, 4000);
  }

  update() {
    this.age++;
    if (this.age > this.lifespan) this.alive = false;
  }

  draw() {
    let lifeT = 1 - Math.pow(Math.max(0, (this.age - this.lifespan * 0.7)) / (this.lifespan * 0.3), 2);
    lifeT = Math.min(lifeT, Math.min(this.age / 120, 1)); // fade in

    // Pulse travels along the vein
    let pulsePos = (frameCount * this.pulseSpeed + this.phase) % 1;
    noFill();
    for (let i = 0; i < this.points.length - 1; i++) {
      let t = i / (this.points.length - 1);
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      // Pulse brightness — traveling wave
      let pulseDist = Math.abs(t - pulsePos);
      if (pulseDist > 0.5) pulseDist = 1 - pulseDist;
      let pulse = Math.pow(Math.max(0, 1 - pulseDist * 5), 2);
      let h = (this.hueVal + t * 30 + hueShift * 0.2) % 360;

      // Glow
      strokeWeight(4);
      stroke(h, 50, 80, (3 + pulse * 12) * lifeT);
      line(p1.x, p1.y, p2.x, p2.y);
      // Core
      strokeWeight(1.2);
      stroke(h, 30, 100, (6 + pulse * 25) * lifeT);
      line(p1.x, p1.y, p2.x, p2.y);

      // Pulse dot
      if (pulse > 0.3) {
        noStroke();
        fill(h, 25, 100, pulse * 20 * lifeT);
        ellipse(lerp(p1.x, p2.x, 0.5), lerp(p1.y, p2.y, 0.5), 6 * pulse);
      }
    }

    // Nodes at junctions
    noStroke();
    for (let i = 0; i < this.points.length; i++) {
      let t = i / (this.points.length - 1);
      let pulseDist = Math.abs(t - pulsePos);
      if (pulseDist > 0.5) pulseDist = 1 - pulseDist;
      let pulse = Math.pow(Math.max(0, 1 - pulseDist * 4), 2);
      let h = (this.hueVal + t * 30 + hueShift * 0.2) % 360;
      fill(h, 40, 100, (5 + pulse * 18) * lifeT);
      ellipse(this.points[i].x, this.points[i].y, 3 + pulse * 4);
    }
  }
}

// ===== PLANT — fractal branching =====
class Plant {
  constructor(x) {
    this.baseX = x;
    this.baseY = getGroundY(x);
    this.growth = 0;
    this.maxHeight = random(80, 250);
    this.segments = Math.floor(random(10, 22));
    this.swayPhase = random(TWO_PI);
    this.swayAmp = random(0.03, 0.07);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-25, 25) + 360) % 360;
    this.hue2 = (this.hueVal + random(50, 100)) % 360;
    this.hue3 = (this.hueVal + random(120, 200)) % 360;
    this.branches = [];
    this.noiseOff = random(1000);
    this.alive = true;
    this.lifespan = random(1500, 3500);
    this.age = 0;
    this.dying = false;
    this.deathAlpha = 1;
    this.hasTip = random() < 0.7;
    this.tipSize = random(4, 12);
    this.fractalDepth = Math.floor(random(1, 3)); // sub-branches

    // Generate branches with sub-branches
    for (let i = 0; i < this.segments; i++) {
      if (random() < 0.4 && i > 2) {
        let br = {
          segIdx: i,
          side: random() > 0.5 ? 1 : -1,
          len: random(20, 65),
          angle: random(0.3, 1.1),
          curl: random(-0.4, 0.4),
          hasLeaf: random() < 0.8,
          leafSize: random(4, 10),
          leafHue: (this.hue2 + random(-25, 25) + 360) % 360,
          subBranches: [],
        };
        // Sub-branches for fractal effect
        if (this.fractalDepth > 0 && random() < 0.5) {
          for (let j = 0; j < Math.floor(random(1, 3)); j++) {
            br.subBranches.push({
              t: random(0.4, 0.9),
              side: random() > 0.5 ? 1 : -1,
              len: br.len * random(0.3, 0.6),
              angle: random(0.2, 0.8),
              hasLeaf: random() < 0.6,
              leafSize: random(2, 5),
              leafHue: (this.hue3 + random(-20, 20) + 360) % 360,
            });
          }
        }
        this.branches.push(br);
      }
    }
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.005, 1);
    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) {
      this.deathAlpha -= 0.0018;
      if (this.deathAlpha <= 0) this.alive = false;
    }
    if (this.growth > 0.7 && random() < 0.008 && !this.dying) {
      let tip = this.getTipPos();
      pollen.push(new Pollen(tip.x, tip.y, this.hueVal));
    }
  }

  getTipPos() {
    let pts = this.getSegmentPoints();
    return pts[pts.length - 1] || { x: this.baseX, y: this.baseY };
  }

  getSegmentPoints() {
    let pts = [{ x: this.baseX, y: this.baseY }];
    let visibleSegs = Math.floor(this.segments * this.growth);
    for (let i = 1; i <= visibleSegs; i++) {
      let t = i / this.segments;
      let segH = (this.maxHeight / this.segments) * this.growth;
      let sway = sin(frameCount * 0.007 + this.swayPhase + t * 2.5) * this.swayAmp * this.maxHeight * t;
      sway += windX * t * 25;
      let noiseWarp = (noise(this.noiseOff + t * 3, globalTime * 0.6) - 0.5) * 14 * t;
      pts.push({ x: this.baseX + sway + noiseWarp, y: this.baseY - segH * i });
    }
    return pts;
  }

  draw() {
    let pts = this.getSegmentPoints();
    if (pts.length < 2) return;
    let a = this.deathAlpha;
    let hShift = hueShift * 0.15;

    // Main stem with multiple glow layers
    noFill();
    for (let w = 0; w < 4; w++) {
      let weight = map(w, 0, 3, 3.5, 0.4);
      let alpha = map(w, 0, 3, 8, 18) * a;
      let h = (this.hueVal + hShift + w * 10) % 360;
      stroke(h, 50 + w * 5, 70 + w * 10, alpha);
      strokeWeight(weight);
      beginShape();
      for (let p of pts) curveVertex(p.x, p.y);
      curveVertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
      endShape();
    }

    // Energy pulse traveling up stem
    let pulseT = (sin(frameCount * 0.012 + this.swayPhase) * 0.5 + 0.5);
    let pulseIdx = Math.floor(pulseT * (pts.length - 1));
    if (pulseIdx < pts.length) {
      let pp = pts[pulseIdx];
      noStroke();
      let ph = (this.hue2 + hShift) % 360;
      fill(ph, 40, 100, 20 * a);
      ellipse(pp.x, pp.y, 10);
      fill(ph, 25, 100, 8 * a);
      ellipse(pp.x, pp.y, 22);
    }

    // Glow along stem
    noStroke();
    for (let i = 0; i < pts.length; i++) {
      let t = i / pts.length;
      let pulse = sin(frameCount * 0.01 + t * 5 + this.swayPhase) * 0.35 + 0.65;
      let h = (lerpHue(this.hueVal, this.hue2, t) + hShift) % 360;
      fill(h, 55, 85, 5 * pulse * a);
      ellipse(pts[i].x, pts[i].y, 10 * (1 - t * 0.4));
    }

    // Branches with sub-branches
    for (let br of this.branches) {
      if (br.segIdx >= pts.length) continue;
      let origin = pts[br.segIdx];
      let windBend = windX * 0.6;
      let bAngle = -HALF_PI + br.side * br.angle + sin(frameCount * 0.005 + br.segIdx) * 0.12 + windBend * br.side;
      let bLen = br.len * this.growth;
      let midX = origin.x + cos(bAngle + br.curl) * bLen * 0.5;
      let midY = origin.y + sin(bAngle + br.curl) * bLen * 0.5;
      let endX = origin.x + cos(bAngle) * bLen;
      let endY = origin.y + sin(bAngle) * bLen;

      // Branch stem
      let bh = (this.hue2 + hShift) % 360;
      stroke(bh, 45, 65, 12 * a);
      strokeWeight(1.2);
      noFill();
      beginShape();
      curveVertex(origin.x, origin.y); curveVertex(origin.x, origin.y);
      curveVertex(midX, midY);
      curveVertex(endX, endY); curveVertex(endX, endY);
      endShape();

      // Sub-branches (fractal)
      for (let sb of br.subBranches) {
        let sbOriginX = lerp(origin.x, endX, sb.t);
        let sbOriginY = lerp(origin.y, endY, sb.t);
        let sbAngle = bAngle + sb.side * sb.angle + sin(frameCount * 0.004 + sb.t * 3) * 0.1;
        let sbEndX = sbOriginX + cos(sbAngle) * sb.len * this.growth;
        let sbEndY = sbOriginY + sin(sbAngle) * sb.len * this.growth;

        stroke(this.hue3, 40, 60, 8 * a);
        strokeWeight(0.7);
        line(sbOriginX, sbOriginY, sbEndX, sbEndY);

        if (sb.hasLeaf && this.growth > 0.5) {
          noStroke();
          let lp = sin(frameCount * 0.007 + sb.t * 4) * 0.25 + 0.75;
          let ls = sb.leafSize * lp * this.growth;
          fill(sb.leafHue, 65, 80, 22 * a);
          ellipse(sbEndX, sbEndY, ls, ls * 1.8);
          fill(sb.leafHue, 45, 100, 10 * a);
          ellipse(sbEndX, sbEndY, ls * 0.4);
        }
      }

      // Main branch leaf
      if (br.hasLeaf && this.growth > 0.4) {
        noStroke();
        let leafPulse = sin(frameCount * 0.007 + br.segIdx * 2) * 0.25 + 0.75;
        let ls = br.leafSize * leafPulse * this.growth;
        let lh = (br.leafHue + hShift) % 360;
        fill(lh, 65, 80, 22 * a);
        ellipse(endX, endY, ls, ls * 1.8);
        fill(lh, 45, 100, 12 * a);
        ellipse(endX, endY, ls * 0.5, ls * 0.9);
        // Leaf glow
        fill(lh, 30, 100, 4 * leafPulse * a);
        ellipse(endX, endY, ls * 3);
      }
    }

    // Glowing tip with sacred geometry hint
    if (this.hasTip && this.growth > 0.6) {
      let tip = pts[pts.length - 1];
      let pulse = sin(frameCount * 0.015 + this.swayPhase) * 0.4 + 0.6;
      let th = (this.hueVal + hShift) % 360;
      noStroke();
      // Outer aura
      fill(th, 25, 100, 5 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize * 5);
      // Mid glow
      fill(th, 35, 100, 15 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize * 2);
      // Core
      fill(th, 20, 100, 30 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize);
      // Hot white center
      fill(0, 0, 100, 20 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize * 0.35);

      // Tiny orbiting dots — sacred geometry feel
      let orbR = this.tipSize * 1.5;
      for (let o = 0; o < 3; o++) {
        let oAngle = frameCount * 0.008 * (o % 2 === 0 ? 1 : -1) + o * TWO_PI / 3 + this.swayPhase;
        let ox = tip.x + cos(oAngle) * orbR * pulse;
        let oy = tip.y + sin(oAngle) * orbR * pulse;
        fill((th + o * 40) % 360, 40, 100, 18 * pulse * a);
        ellipse(ox, oy, 2);
      }
    }
  }
}

// ===== FLOWER — sacred geometry bloom =====
class Flower {
  constructor(x) {
    this.x = x;
    this.baseY = getGroundY(x);
    this.stemHeight = random(50, 140);
    this.bloom = 0;
    this.bloomCycle = random(500, 1200);
    this.petalCount = Math.floor(random(6, 13));
    this.petalLen = random(14, 35);
    this.innerPetalCount = Math.floor(this.petalCount * 0.6);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-15, 15) + 360) % 360;
    this.hue2 = (this.hueVal + random(60, 120)) % 360;
    this.hue3 = (this.hueVal + random(150, 210)) % 360;
    this.stemHue = (120 + random(-30, 30) + 360) % 360;
    this.phase = random(TWO_PI);
    this.noiseOff = random(1000);
    this.alive = true;
    this.age = 0;
    this.lifespan = random(2000, 5000);
    this.deathAlpha = 1;
    this.dying = false;
    this.growth = 0;
    this.rotSpeed = random(0.0005, 0.002) * (random() > 0.5 ? 1 : -1);
    this.hasSacredGeo = random() < 0.5;
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.003, 1);
    let cyclePos = (frameCount + this.phase * 100) % this.bloomCycle;
    let t = cyclePos / this.bloomCycle;
    let bloomTarget = t < 0.5 ? smoothstep(0, 0.5, t) : smoothstep(1, 0.5, t);
    this.bloom = lerp(this.bloom, bloomTarget, 0.025);

    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) {
      this.deathAlpha -= 0.0012;
      if (this.deathAlpha <= 0) this.alive = false;
    }
    if (this.bloom > 0.6 && random() < 0.012 && !this.dying) {
      let head = this.getHeadPos();
      pollen.push(new Pollen(head.x + random(-10, 10), head.y + random(-10, 10), this.hueVal));
    }
  }

  getHeadPos() {
    let sway = sin(frameCount * 0.005 + this.phase) * 10 + windX * 18;
    return { x: this.x + sway, y: this.baseY - this.stemHeight * this.growth };
  }

  draw() {
    let a = this.deathAlpha;
    let sway = sin(frameCount * 0.005 + this.phase) * 10 + windX * 18;
    let headX = this.x + sway;
    let headY = this.baseY - this.stemHeight * this.growth;
    let hShift = hueShift * 0.15;

    // Stem with glow
    for (let w = 0; w < 2; w++) {
      stroke((this.stemHue + hShift) % 360, 45 - w * 15, 50 + w * 30, (12 + w * 4) * a);
      strokeWeight(2 - w * 0.8);
      noFill();
      beginShape();
      curveVertex(this.x, this.baseY); curveVertex(this.x, this.baseY);
      curveVertex(this.x + sway * 0.3, this.baseY - this.stemHeight * 0.4 * this.growth);
      curveVertex(headX, headY); curveVertex(headX, headY);
      endShape();
    }

    if (this.growth < 0.25) return;

    push();
    translate(headX, headY);
    let rot = frameCount * this.rotSpeed;

    // Outer petals
    for (let p = 0; p < this.petalCount; p++) {
      let baseAngle = (TWO_PI / this.petalCount) * p - HALF_PI + rot;
      let spreadAngle = baseAngle * (0.3 + this.bloom * 0.7);
      let pLen = this.petalLen * (0.3 + this.bloom * 0.7) * this.growth;
      let petalHue = (lerpHue(this.hueVal, this.hue2, p / this.petalCount) + hShift) % 360;

      noStroke();
      push();
      rotate(spreadAngle);
      // Outer glow
      fill(petalHue, 50, 90, 8 * a * this.bloom);
      ellipse(0, -pLen * 0.5, pLen * 0.7, pLen * 1.3);
      // Petal body
      fill(petalHue, 65, 85, 22 * a);
      ellipse(0, -pLen * 0.5, pLen * 0.45, pLen);
      // Inner vein
      fill(petalHue, 40, 100, 12 * a);
      ellipse(0, -pLen * 0.4, pLen * 0.15, pLen * 0.7);
      pop();
    }

    // Inner petals (second layer, offset)
    for (let p = 0; p < this.innerPetalCount; p++) {
      let baseAngle = (TWO_PI / this.innerPetalCount) * p - HALF_PI + rot * -1.3 + PI / this.innerPetalCount;
      let spreadAngle = baseAngle * (0.3 + this.bloom * 0.7);
      let pLen = this.petalLen * 0.6 * (0.3 + this.bloom * 0.7) * this.growth;
      let petalHue = (lerpHue(this.hue2, this.hue3, p / this.innerPetalCount) + hShift) % 360;

      noStroke();
      push();
      rotate(spreadAngle);
      fill(petalHue, 55, 95, 18 * a);
      ellipse(0, -pLen * 0.5, pLen * 0.35, pLen);
      fill(petalHue, 35, 100, 10 * a);
      ellipse(0, -pLen * 0.35, pLen * 0.12, pLen * 0.5);
      pop();
    }

    // Sacred geometry overlay
    if (this.hasSacredGeo && this.bloom > 0.5) {
      let geoAlpha = (this.bloom - 0.5) * 2 * a;
      let geoR = this.petalLen * this.bloom * 0.8;
      noFill();
      // Concentric rings
      for (let r = 0; r < 3; r++) {
        let rr = geoR * (0.3 + r * 0.3);
        let h = (this.hueVal + r * 30 + hShift) % 360;
        stroke(h, 30, 100, 6 * geoAlpha);
        strokeWeight(0.4);
        ellipse(0, 0, rr * 2);
      }
      // Radiating lines
      for (let l = 0; l < this.petalCount; l++) {
        let la = (TWO_PI / this.petalCount) * l + rot * 0.5;
        stroke(this.hueVal, 25, 100, 4 * geoAlpha);
        strokeWeight(0.3);
        line(0, 0, cos(la) * geoR, sin(la) * geoR);
      }
    }

    // Center jewel
    let centerPulse = sin(frameCount * 0.02 + this.phase) * 0.25 + 0.75;
    noStroke();
    let ch = (this.hueVal + hShift) % 360;
    fill(ch, 40, 100, 8 * this.bloom * a);
    ellipse(0, 0, this.petalLen * 1.5 * this.bloom);
    fill(ch, 30, 100, 35 * this.bloom * centerPulse * a);
    ellipse(0, 0, 7 * this.growth);
    fill((this.hue2 + hShift) % 360, 50, 100, 20 * this.bloom * centerPulse * a);
    ellipse(0, 0, 4 * this.growth);
    fill(0, 0, 100, 25 * this.bloom * centerPulse * a);
    ellipse(0, 0, 2 * this.growth);

    pop();
  }
}

// ===== MUSHROOM — bigger, more psychedelic =====
class Mushroom {
  constructor(x) {
    this.x = x;
    this.baseY = getGroundY(x);
    this.capWidth = random(18, 45);
    this.capHeight = random(12, 22);
    this.stemH = random(15, 40);
    this.stemW = random(4, 9);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-20, 20) + 360) % 360;
    this.hue2 = (this.hueVal + 60) % 360;
    this.hue3 = (this.hueVal + 180) % 360;
    this.phase = random(TWO_PI);
    this.growth = 0;
    this.alive = true;
    this.age = 0;
    this.lifespan = random(2500, 6000);
    this.dying = false;
    this.deathAlpha = 1;
    this.spots = [];
    for (let i = 0; i < Math.floor(random(4, 9)); i++) {
      this.spots.push({
        angle: random(-PI * 0.85, PI * 0.85),
        dist: random(0.2, 0.85),
        size: random(2, 5),
        hueOff: random(-20, 20),
      });
    }
    this.gillCount = Math.floor(random(6, 12));
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.004, 1);
    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) {
      this.deathAlpha -= 0.0015;
      if (this.deathAlpha <= 0) this.alive = false;
    }
    if (this.growth > 0.85 && random() < 0.015 && !this.dying) {
      let capTop = this.baseY - this.stemH * this.growth - this.capHeight * this.growth * 0.5;
      pollen.push(new Pollen(
        this.x + random(-this.capWidth * 0.4, this.capWidth * 0.4),
        capTop, this.hueVal, true
      ));
    }
  }

  draw() {
    let a = this.deathAlpha;
    let g = this.growth;
    let pulse = sin(frameCount * 0.01 + this.phase) * 0.2 + 0.8;
    let breathe = sin(frameCount * 0.006 + this.phase * 2) * 0.05 + 1;
    let capY = this.baseY - this.stemH * g;
    let hShift = hueShift * 0.2;
    let h = (this.hueVal + hShift) % 360;

    // Ground glow pool
    noStroke();
    fill(h, 45, 70, 8 * pulse * a * g);
    ellipse(this.x, this.baseY, this.capWidth * 4, 12);
    fill(h, 35, 90, 4 * pulse * a * g);
    ellipse(this.x, this.baseY, this.capWidth * 6, 16);

    // Stem
    fill(h, 20, 45, 22 * a);
    rectMode(CENTER);
    rect(this.x, this.baseY - this.stemH * g * 0.5, this.stemW * g * breathe, this.stemH * g, 3);
    fill(h, 30, 80, 6 * pulse * a);
    rect(this.x, this.baseY - this.stemH * g * 0.5, this.stemW * g * 0.4, this.stemH * g, 3);
    rectMode(CORNER);

    // Gills under cap
    let gillY = capY + 2;
    for (let gi = 0; gi < this.gillCount; gi++) {
      let gx = map(gi, 0, this.gillCount - 1, this.x - this.capWidth * 0.4 * g, this.x + this.capWidth * 0.4 * g);
      stroke(h, 30, 70, 8 * a * g);
      strokeWeight(0.4);
      line(gx, gillY, gx + (gx - this.x) * 0.3, gillY + this.capHeight * 0.3 * g);
    }
    noStroke();

    // Cap — double arc for volume
    fill(h, 55, 55, 28 * a);
    arc(this.x, capY, this.capWidth * g * breathe, this.capHeight * g * 2 * breathe, PI, TWO_PI, CHORD);
    // Cap highlight
    fill(h, 40, 80, 12 * pulse * a);
    arc(this.x, capY, this.capWidth * g * 0.75 * breathe, this.capHeight * g * 1.5 * breathe, PI, TWO_PI, CHORD);
    // Cap hot glow
    fill(h, 30, 100, 6 * pulse * a);
    arc(this.x, capY - this.capHeight * g * 0.15, this.capWidth * g * 0.4, this.capHeight * g * 0.8, PI, TWO_PI, CHORD);

    // Spots — pulsing, hue-shifting
    for (let spot of this.spots) {
      let sx = this.x + cos(spot.angle) * this.capWidth * 0.38 * spot.dist * g;
      let sy = capY - abs(sin(spot.angle)) * this.capHeight * 0.45 * spot.dist * g;
      let spotPulse = sin(frameCount * 0.015 + spot.angle * 2 + this.phase) * 0.3 + 0.7;
      let sh = ((this.hue2 + spot.hueOff + hShift) + 360) % 360;
      fill(sh, 35, 100, 20 * spotPulse * a);
      ellipse(sx, sy, spot.size * g * spotPulse);
      fill(sh, 20, 100, 8 * spotPulse * a);
      ellipse(sx, sy, spot.size * g * 2.5);
    }

    // Top aura
    fill(h, 25, 100, 5 * pulse * a * g);
    ellipse(this.x, capY - this.capHeight * g * 0.3, this.capWidth * 2.5 * g, this.capHeight * 2.5 * g);

    // Light rays radiating up
    if (g > 0.7) {
      for (let r = 0; r < 5; r++) {
        let rayAngle = -HALF_PI + (r - 2) * 0.25 + sin(frameCount * 0.003 + r) * 0.08;
        let rayLen = random(20, 45) * g * pulse;
        let rh = (h + r * 15) % 360;
        stroke(rh, 30, 100, 3 * pulse * a);
        strokeWeight(0.5);
        line(this.x, capY - this.capHeight * g * 0.5,
          this.x + cos(rayAngle) * rayLen,
          capY - this.capHeight * g * 0.5 + sin(rayAngle) * rayLen);
      }
      noStroke();
    }
  }
}

// ===== FIREFLY =====
class Firefly {
  constructor() {
    this.x = random(width);
    this.y = random(height * 0.35, height * 0.92);
    this.vx = 0;
    this.vy = 0;
    this.hueVal = random([50, 60, 80, 120, 40, 30]);
    this.size = random(1.5, 4);
    this.phase = random(TWO_PI);
    this.glowSpeed = random(0.012, 0.04);
    this.noiseX = random(1000);
    this.noiseY = random(1000);
    this.wanderSpeed = random(0.3, 1.0);
    this.alive = true;
    this.trail = [];
    this.maxTrail = Math.floor(random(5, 15));
  }

  update() {
    let nx = noise(this.noiseX, globalTime * 2) - 0.5;
    let ny = noise(this.noiseY, globalTime * 2) - 0.5;
    this.vx += nx * 0.18 + windX * 0.35;
    this.vy += ny * 0.18 + windY * 0.12;
    this.vx *= 0.94;
    this.vy *= 0.94;
    let spd = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > this.wanderSpeed) {
      this.vx = (this.vx / spd) * this.wanderSpeed;
      this.vy = (this.vy / spd) * this.wanderSpeed;
    }
    this.x += this.vx;
    this.y += this.vy;

    // Mouse attraction
    let dm = dist(this.x, this.y, mouseX, mouseY);
    if (dm < 250 && dm > 15) {
      this.vx += (mouseX - this.x) * 0.0004;
      this.vy += (mouseY - this.y) * 0.0004;
    }

    if (this.x < -30) this.x = width + 30;
    if (this.x > width + 30) this.x = -30;
    if (this.y < height * 0.15) this.vy += 0.03;
    if (this.y > height * 0.96) this.vy -= 0.06;

    this.noiseX += 0.006;
    this.noiseY += 0.006;

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    while (this.trail.length > this.maxTrail) this.trail.shift();
  }

  draw() {
    let glow = sin(frameCount * this.glowSpeed + this.phase);
    let brightness = glow > 0.15 ? map(glow, 0.15, 1, 0.3, 1) : 0.04;
    let h = (this.hueVal + hueShift * 0.08) % 360;

    // Trail
    noStroke();
    for (let i = 0; i < this.trail.length; i++) {
      let t = i / this.trail.length;
      let ta = brightness * t * 6;
      fill(h, 40, 100, ta);
      ellipse(this.trail[i].x, this.trail[i].y, this.size * 0.6 * t);
    }

    // Outer glow
    fill(h, 40, 100, 5 * brightness);
    ellipse(this.x, this.y, this.size * 12);
    // Mid glow
    fill(h, 55, 100, 14 * brightness);
    ellipse(this.x, this.y, this.size * 5);
    // Core
    fill(h, 30, 100, 45 * brightness);
    ellipse(this.x, this.y, this.size);
    // Hot center
    fill(0, 0, 100, 30 * brightness);
    ellipse(this.x, this.y, this.size * 0.4);
  }
}

// ===== MOTH =====
class Moth {
  constructor() {
    this.x = random(width);
    this.y = random(height * 0.2, height * 0.7);
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.3, 0.3);
    this.wingSpan = random(10, 22);
    this.flapSpeed = random(0.08, 0.15);
    this.hueVal = random([270, 290, 30, 40, 200, 320]);
    this.hue2 = (this.hueVal + random(40, 80)) % 360;
    this.phase = random(TWO_PI);
    this.noiseOff = random(1000);
    this.alive = true;
    this.targetX = random(width);
    this.targetY = random(height * 0.2, height * 0.7);
    this.retargetTimer = 0;
    this.trail = [];
  }

  update() {
    this.retargetTimer++;
    if (this.retargetTimer > random(150, 500)) {
      this.retargetTimer = 0;
      let targets = [...flowers, ...mushrooms].filter(f => f.alive && f.growth > 0.5);
      if (targets.length > 0 && random() < 0.65) {
        let t = random(targets);
        this.targetX = t.x + random(-30, 30);
        this.targetY = (t.baseY || t.y) - random(20, 70);
      } else {
        this.targetX = random(width * 0.1, width * 0.9);
        this.targetY = random(height * 0.15, height * 0.7);
      }
    }

    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d > 5) {
      this.vx += (dx / d) * 0.025;
      this.vy += (dy / d) * 0.025;
    }
    this.vx += (noise(this.noiseOff, globalTime * 3) - 0.5) * 0.12;
    this.vy += (noise(this.noiseOff + 100, globalTime * 3) - 0.5) * 0.12;
    this.vx += windX * 0.25;
    this.vx *= 0.96;
    this.vy *= 0.96;
    let spd = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > 1.8) { this.vx *= 1.8 / spd; this.vy *= 1.8 / spd; }
    this.x += this.vx;
    this.y += this.vy;
    this.x = constrain(this.x, -40, width + 40);
    this.y = constrain(this.y, height * 0.05, height * 0.87);
    this.noiseOff += 0.012;

    this.trail.push({ x: this.x, y: this.y });
    while (this.trail.length > 20) this.trail.shift();
  }

  draw() {
    let flap = sin(frameCount * this.flapSpeed + this.phase);
    let wingAngle = flap * 0.65;
    let bodyAngle = atan2(this.vy, this.vx);
    let h = (this.hueVal + hueShift * 0.12) % 360;
    let h2 = (this.hue2 + hueShift * 0.12) % 360;

    // Dust trail
    noStroke();
    for (let i = 0; i < this.trail.length; i++) {
      let t = i / this.trail.length;
      fill(h, 30, 100, t * 3);
      ellipse(this.trail[i].x, this.trail[i].y, 1.5 * t);
    }

    push();
    translate(this.x, this.y);
    rotate(bodyAngle);
    let ws = this.wingSpan;
    noStroke();

    for (let side = -1; side <= 1; side += 2) {
      push();
      scale(1, side);
      rotate(wingAngle * 0.5);
      fill(h, 45, 65, 22);
      ellipse(-ws * 0.1, -ws * 0.3, ws * 0.85, ws * 0.55);
      fill(h2, 35, 85, 12);
      ellipse(-ws * 0.1, -ws * 0.25, ws * 0.55, ws * 0.35);
      // Eye spots
      fill(h, 25, 100, 16);
      ellipse(0, -ws * 0.32, ws * 0.18, ws * 0.18);
      fill(0, 0, 100, 8);
      ellipse(0, -ws * 0.32, ws * 0.06);
      pop();
    }

    for (let side = -1; side <= 1; side += 2) {
      push();
      scale(1, side);
      rotate(-wingAngle * 0.3);
      fill(h, 40, 55, 16);
      ellipse(ws * 0.15, -ws * 0.15, ws * 0.55, ws * 0.4);
      pop();
    }

    fill(h, 20, 40, 28);
    ellipse(0, 0, ws * 0.4, ws * 0.13);
    // Antennae
    stroke(h, 20, 60, 15);
    strokeWeight(0.5);
    let antLen = ws * 0.3;
    line(-ws * 0.15, 0, -ws * 0.15 - antLen * 0.7, -antLen);
    line(-ws * 0.15, 0, -ws * 0.15 - antLen * 0.7, antLen);
    noStroke();

    if (random() < 0.4) {
      pollen.push(new Pollen(this.x + random(-3, 3), this.y + random(-3, 3), h, false, true));
    }

    pop();
  }
}

// ===== POLLEN / SPORE =====
class Pollen {
  constructor(x, y, hueVal, isSpore, isTiny) {
    this.x = x;
    this.y = y;
    this.hueVal = hueVal;
    this.size = isTiny ? random(0.5, 1.5) : (isSpore ? random(1.2, 3) : random(2, 4));
    this.life = 1;
    this.decay = isTiny ? random(0.008, 0.025) : random(0.002, 0.007);
    this.vx = random(-0.4, 0.4);
    this.vy = random(-0.5, -0.1);
    this.isSpore = isSpore;
    this.noiseOff = random(1000);
  }

  update() {
    this.vx += windX * 0.06 + (noise(this.noiseOff, globalTime * 3) - 0.5) * 0.06;
    this.vy += (noise(this.noiseOff + 50, globalTime * 3) - 0.5) * 0.06;
    if (this.isSpore) this.vy -= 0.015;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.noiseOff += 0.02;
  }

  draw() {
    noStroke();
    let a = this.life;
    let h = (this.hueVal + hueShift * 0.1) % 360;
    fill(h, 35, 100, a * 18);
    ellipse(this.x, this.y, this.size);
    fill(h, 20, 100, a * 7);
    ellipse(this.x, this.y, this.size * 3);
  }

  isDead() { return this.life <= 0; }
}

// ===== SPAWN =====
function spawnPlant() {
  if (plants.length >= MAX_PLANTS) return;
  plants.push(new Plant(random(width * 0.03, width * 0.97)));
  if (audioReady) playNote(SCALE_NOTES[Math.floor(random(SCALE_NOTES.length))], Math.floor(random(25, 55)));
}
function spawnFlower() {
  if (flowers.length >= MAX_FLOWERS) return;
  flowers.push(new Flower(random(width * 0.05, width * 0.95)));
  if (audioReady) playNote(SCALE_NOTES[Math.floor(random(4, SCALE_NOTES.length))], Math.floor(random(30, 60)));
}
function spawnMushroom() {
  if (mushrooms.length >= MAX_MUSHROOMS) return;
  mushrooms.push(new Mushroom(random(width * 0.05, width * 0.95)));
  if (audioReady) playNote(SCALE_NOTES[Math.floor(random(3))], Math.floor(random(20, 45)));
}
function spawnFirefly() {
  if (fireflies.length >= MAX_FIREFLIES) return;
  fireflies.push(new Firefly());
}
function spawnMoth() {
  if (moths.length >= MAX_MOTHS) return;
  moths.push(new Moth());
}
function spawnEnergyVein() {
  if (energyVeins.length >= MAX_ENERGY_VEINS) return;
  energyVeins.push(new EnergyVein());
}

// ===== INTERFERENCE PATTERN — between nearby organisms =====
function drawInterference() {
  let organisms = [...flowers.filter(f => f.bloom > 0.5 && f.growth > 0.5),
                    ...mushrooms.filter(m => m.growth > 0.7)];
  if (organisms.length < 2) return;

  noStroke();
  for (let i = 0; i < organisms.length; i++) {
    for (let j = i + 1; j < organisms.length; j++) {
      let a = organisms[i];
      let b = organisms[j];
      let d = dist(a.x, a.baseY, b.x, b.baseY);
      if (d < 300 && d > 30) {
        let strength = map(d, 30, 300, 6, 0);
        let midX = (a.x + b.x) / 2;
        let midY = (a.baseY + b.baseY) / 2 - 20;
        // Interference rings
        let h = (lerpHue(a.hueVal, b.hueVal, 0.5) + hueShift * 0.15) % 360;
        for (let r = 0; r < 3; r++) {
          let ringR = (frameCount * 0.3 + r * 25) % d;
          let ringA = strength * (1 - ringR / d) * sin(ringR * 0.15) * 0.5;
          if (ringA > 0.3) {
            stroke(h, 35, 100, ringA);
            strokeWeight(0.4);
            noFill();
            ellipse(midX, midY, ringR * 2, ringR);
          }
        }
      }
    }
  }
  noStroke();
}

// ===== FIREFLY CONNECTIONS =====
function drawFireflyConnections() {
  for (let i = 0; i < fireflies.length; i++) {
    for (let j = i + 1; j < fireflies.length; j++) {
      let d = dist(fireflies[i].x, fireflies[i].y, fireflies[j].x, fireflies[j].y);
      if (d < 70) {
        let a = map(d, 0, 70, 5, 0);
        let h = (55 + hueShift * 0.08) % 360;
        stroke(h, 35, 100, a);
        strokeWeight(0.3);
        line(fireflies[i].x, fireflies[i].y, fireflies[j].x, fireflies[j].y);
      }
    }
  }
  noStroke();
}

// ===== DRAW =====
function draw() {
  globalTime += 0.001;
  hueShift = (hueShift + 0.08) % 360; // slow global hue rotation
  background(0);

  // Wind
  let mx = mouseX - lastMouseX;
  let my = mouseY - lastMouseY;
  targetWindX = constrain(mx * 0.012, -0.6, 0.6);
  targetWindY = constrain(my * 0.006, -0.25, 0.25);
  windX = lerp(windX, targetWindX, 0.02);
  windY = lerp(windY, targetWindY, 0.02);
  windX += (noise(globalTime * 200) - 0.5) * 0.003;
  lastMouseX = mouseX;
  lastMouseY = mouseY;

  // Sky
  drawStars();
  drawAurora();
  updateShootingStars();

  if (awaitingClick) {
    drawTreeline();
    drawGround();
    drawStartPrompt();
    return;
  }

  // Auto-spawn
  spawnTimer++;
  if (spawnTimer % 250 === 0) spawnPlant();
  if (spawnTimer % 400 === 0) spawnFlower();
  if (spawnTimer % 550 === 0) spawnMushroom();
  if (spawnTimer % 100 === 0) spawnFirefly();
  if (spawnTimer % 750 === 0) spawnMoth();
  if (spawnTimer % 600 === 0) spawnEnergyVein();

  // Layers
  drawTreeline();
  drawGround();

  // Energy veins (underground mycelium)
  for (let i = energyVeins.length - 1; i >= 0; i--) {
    energyVeins[i].update();
    energyVeins[i].draw();
    if (!energyVeins[i].alive) energyVeins.splice(i, 1);
  }

  // Interference patterns between organisms
  drawInterference();

  // Mushrooms
  for (let i = mushrooms.length - 1; i >= 0; i--) {
    mushrooms[i].update();
    mushrooms[i].draw();
    if (!mushrooms[i].alive) mushrooms.splice(i, 1);
  }

  // Plants
  for (let i = plants.length - 1; i >= 0; i--) {
    plants[i].update();
    plants[i].draw();
    if (!plants[i].alive) plants.splice(i, 1);
  }

  // Flowers
  for (let i = flowers.length - 1; i >= 0; i--) {
    flowers[i].update();
    flowers[i].draw();
    if (!flowers[i].alive) flowers.splice(i, 1);
  }

  // Moths
  for (let i = moths.length - 1; i >= 0; i--) {
    moths[i].update();
    moths[i].draw();
    if (!moths[i].alive) moths.splice(i, 1);
  }

  // Fireflies
  for (let ff of fireflies) { ff.update(); ff.draw(); }

  // Pollen
  for (let i = pollen.length - 1; i >= 0; i--) {
    pollen[i].update();
    pollen[i].draw();
    if (pollen[i].isDead()) pollen.splice(i, 1);
  }
  while (pollen.length > 500) pollen.shift();

  drawFireflyConnections();
}

// ===== AUDIO =====
function initAudio() {
  if (audioReady) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let silentBuf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    let silentSrc = audioCtx.createBufferSource();
    silentSrc.buffer = silentBuf;
    silentSrc.connect(audioCtx.destination);
    silentSrc.start(0);
    audioCtx.resume();

    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(20, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.15, audioCtx.currentTime);
    compressor.connect(audioCtx.destination);

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.45, audioCtx.currentTime);

    dryGain = audioCtx.createGain();
    dryGain.gain.setValueAtTime(0.25, audioCtx.currentTime);

    let irLen = Math.min(Math.floor(audioCtx.sampleRate * 5), 220000);
    let ir = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      let data = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.2);
      }
    }
    let convolver = audioCtx.createConvolver();
    convolver.buffer = ir;
    wetGain = audioCtx.createGain();
    wetGain.gain.setValueAtTime(0.8, audioCtx.currentTime);

    delayNode = audioCtx.createDelay(3.0);
    delayNode.delayTime.setValueAtTime(1.5, audioCtx.currentTime);
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.setValueAtTime(0.35, audioCtx.currentTime);
    delayFilter = audioCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(750, audioCtx.currentTime);
    delayGain = audioCtx.createGain();
    delayGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

    masterGain.connect(dryGain);
    dryGain.connect(compressor);
    masterGain.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(compressor);
    masterGain.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(delayGain);
    delayGain.connect(compressor);

    audioReady = true;
  } catch (e) { console.error('Audio init failed:', e); }
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function playNote(note, velocity) {
  if (!audioReady) return;
  if (voices.has(note)) releaseNote(note);
  let now = audioCtx.currentTime;
  let freq = midiToFreq(note);
  let vel = velocity / 127;

  let carrier = audioCtx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(freq, now);
  let carrier2 = audioCtx.createOscillator();
  carrier2.type = 'sine';
  carrier2.frequency.setValueAtTime(freq * 1.004, now);
  let carrier3 = audioCtx.createOscillator();
  carrier3.type = 'sine';
  carrier3.frequency.setValueAtTime(freq * 0.996, now);
  let sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq / 2, now);
  let subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0.1 * vel, now);
  sub.connect(subGain);
  let fifth = audioCtx.createOscillator();
  fifth.type = 'sine';
  fifth.frequency.setValueAtTime(freq * 1.498, now);
  let fifthGain = audioCtx.createGain();
  fifthGain.gain.setValueAtTime(0.03 * vel, now);
  fifthGain.gain.exponentialRampToValueAtTime(Math.max(0.01 * vel, 0.001), now + 3);
  fifth.connect(fifthGain);
  let modulator = audioCtx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(freq * 2, now);
  let modGain = audioCtx.createGain();
  modGain.gain.setValueAtTime(15 * vel, now);
  modGain.gain.exponentialRampToValueAtTime(Math.max(2 * vel, 0.01), now + 3);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  let filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500 + vel * 700, now);
  filter.Q.setValueAtTime(0.5, now);
  let voiceGain = audioCtx.createGain();
  voiceGain.gain.setValueAtTime(0.001, now);
  voiceGain.gain.linearRampToValueAtTime(vel * 0.12, now + 2.5);
  voiceGain.gain.exponentialRampToValueAtTime(Math.max(vel * 0.08, 0.001), now + 7);
  let c2Gain = audioCtx.createGain();
  c2Gain.gain.setValueAtTime(0.4, now);
  carrier2.connect(c2Gain);
  let c3Gain = audioCtx.createGain();
  c3Gain.gain.setValueAtTime(0.4, now);
  carrier3.connect(c3Gain);

  carrier.connect(filter);
  c2Gain.connect(filter);
  c3Gain.connect(filter);
  subGain.connect(filter);
  fifthGain.connect(filter);
  filter.connect(voiceGain);
  voiceGain.connect(masterGain);

  modulator.start(now);
  carrier.start(now);
  carrier2.start(now);
  carrier3.start(now);
  sub.start(now);
  fifth.start(now);

  voices.set(note, { carrier, carrier2, carrier3, modulator, sub, fifth, modGain, subGain, fifthGain, c2Gain, c3Gain, filter, voiceGain });
  setTimeout(() => releaseNote(note), random(4000, 12000));
}

function releaseNote(note) {
  let voice = voices.get(note);
  if (!voice) return;
  let now = audioCtx.currentTime;
  let rel = 6.0;
  voice.voiceGain.gain.cancelScheduledValues(now);
  voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
  voice.voiceGain.gain.exponentialRampToValueAtTime(0.001, now + rel);
  voice.modGain.gain.cancelScheduledValues(now);
  voice.modGain.gain.setValueAtTime(voice.modGain.gain.value, now);
  voice.modGain.gain.exponentialRampToValueAtTime(0.01, now + rel);
  voice.subGain.gain.cancelScheduledValues(now);
  voice.subGain.gain.setValueAtTime(voice.subGain.gain.value, now);
  voice.subGain.gain.exponentialRampToValueAtTime(0.001, now + rel);
  voice.fifthGain.gain.cancelScheduledValues(now);
  voice.fifthGain.gain.setValueAtTime(voice.fifthGain.gain.value, now);
  voice.fifthGain.gain.exponentialRampToValueAtTime(0.001, now + rel);
  let stopTime = now + rel + 0.2;
  voice.carrier.stop(stopTime);
  voice.carrier2.stop(stopTime);
  voice.carrier3.stop(stopTime);
  voice.modulator.stop(stopTime);
  voice.sub.stop(stopTime);
  voice.fifth.stop(stopTime);
  setTimeout(() => voices.delete(note), (rel + 0.5) * 1000);
}

// ===== HELPERS =====
function lerpHue(h1, h2, t) {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (h1 + diff * t + 360) % 360;
}

function smoothstep(edge0, edge1, x) {
  let t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function toggleFullscreen() {
  let doc = document.documentElement;
  if (!document.fullscreenElement) doc.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

// ===== START PROMPT =====
function drawStartPrompt() {
  let pulse = sin(frameCount * 0.012) * 8 + 55;
  fill(0, 0, 100, pulse);
  textAlign(CENTER, CENTER);
  textSize(18);
  text('TAP TO ENTER THE GARDEN', width / 2, height * 0.4);
  textSize(12);
  fill(0, 0, 45, pulse * 0.4);
  text('turn sound on', width / 2, height * 0.4 + 30);
  textSize(10);
  fill(0, 0, 35, pulse * 0.3);
  text('Shift + F for fullscreen', width / 2, height * 0.4 + 52);
}

// ===== INPUT =====
function keyPressed() {
  if (key === 'F') { toggleFullscreen(); return false; }
  if (awaitingClick && (key === ' ' || key === 'Enter')) {
    awaitingClick = false;
    try { initAudio(); } catch (e) {}
    for (let i = 0; i < 6; i++) spawnPlant();
    for (let i = 0; i < 4; i++) spawnFlower();
    for (let i = 0; i < 3; i++) spawnMushroom();
    for (let i = 0; i < 40; i++) spawnFirefly();
    for (let i = 0; i < 3; i++) spawnMoth();
    for (let i = 0; i < 4; i++) spawnEnergyVein();
    return false;
  }
  return false;
}

function mousePressed() {
  if (awaitingClick) return;
  let r = random();
  if (r < 0.35) {
    plants.push(new Plant(mouseX));
    if (audioReady) playNote(SCALE_NOTES[Math.floor(random(SCALE_NOTES.length))], Math.floor(random(35, 65)));
  } else if (r < 0.6) {
    flowers.push(new Flower(mouseX));
    if (audioReady) playNote(SCALE_NOTES[Math.floor(random(4, SCALE_NOTES.length))], Math.floor(random(40, 70)));
  } else if (r < 0.85) {
    mushrooms.push(new Mushroom(mouseX));
    if (audioReady) playNote(SCALE_NOTES[Math.floor(random(3))], Math.floor(random(25, 50)));
  } else {
    spawnEnergyVein();
  }
  // Burst of fireflies + pollen explosion
  for (let i = 0; i < 8; i++) {
    let ff = new Firefly();
    ff.x = mouseX + random(-40, 40);
    ff.y = mouseY + random(-40, 40);
    fireflies.push(ff);
  }
  for (let i = 0; i < 15; i++) {
    pollen.push(new Pollen(
      mouseX + random(-20, 20), mouseY + random(-20, 20),
      (random(360) + hueShift) % 360
    ));
  }
  while (fireflies.length > MAX_FIREFLIES + 30) fireflies.shift();
}

function doubleClicked() {
  toggleFullscreen();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  trailBuffer = createGraphics(width, height);
  trailBuffer.colorMode(HSB, 360, 100, 100, 100);
  initStars();
  generateTreeline();
  generateGround();
}
