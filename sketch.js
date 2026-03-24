// ============================================================
// NIGHT GARDEN II — Bioluminescent ecosystem
// ============================================================
// Fewer elements, each one more alive. Growing plants, blooming
// flowers, glowing mushrooms, fireflies. Dynamic generative audio
// with distinct timbres per organism type.
// Click/tap to enter. Shift+F or double-click for fullscreen.
// Mouse creates gentle wind. Click to plant.
// ============================================================

// ===== CONFIG =====
const MAX_PLANTS = 8;
const MAX_FLOWERS = 5;
const MAX_MUSHROOMS = 4;
const MAX_FIREFLIES = 35;

const SCALE_NOTES = [38, 42, 45, 50, 54, 57, 62, 66, 69];
const PALETTES = [
  { base: 280, spread: 60 },
  { base: 160, spread: 50 },
  { base: 320, spread: 45 },
  { base: 200, spread: 55 },
  { base: 80, spread: 45 },
  { base: 30, spread: 55 },
];

// ===== STATE =====
let plants = [];
let flowers = [];
let mushrooms = [];
let fireflies = [];
let pollen = [];
let bgStars = [];
let shootingStars = [];
let treeline = [];
let groundLine = [];

let windX = 0, windY = 0;
let globalTime = 0;
let spawnTimer = 0;

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

  initStars();
  generateTreeline();
  generateGround();

  function startGarden() {
    if (!awaitingClick) return;
    awaitingClick = false;
    try { initAudio(); } catch (e) { console.error('Audio init error:', e); }
    // Fireflies appear immediately (silent)
    for (let i = 0; i < 20; i++) spawnFirefly();
    // Stagger the rest so audio breathes in
    setTimeout(() => spawnPlant(), 800);
    setTimeout(() => spawnFlower(), 2500);
    setTimeout(() => spawnPlant(), 4000);
    setTimeout(() => spawnMushroom(), 5500);
    setTimeout(() => spawnPlant(), 7500);
    setTimeout(() => spawnFlower(), 9500);
    setTimeout(() => spawnMushroom(), 12000);
    setTimeout(() => spawnPlant(), 15000);
  }

  document.addEventListener('touchstart', startGarden, { passive: true });
  document.addEventListener('touchend', startGarden, { passive: true });
  document.addEventListener('click', startGarden);
  document.addEventListener('pointerdown', startGarden);
}

// ===== STARS =====
function initStars() {
  bgStars = [];
  for (let i = 0; i < 250; i++) {
    bgStars.push({
      x: random(width), y: random(height * 0.78),
      size: random(0.3, 2.2),
      phase: random(TWO_PI),
      twinkleSpeed: random(0.005, 0.025),
      hueVal: random() < 0.7 ? 0 : random([210, 30, 350, 60]),
      sat: random() < 0.7 ? 0 : random(15, 35),
      brightness: random(50, 100),
      baseAlpha: random(15, 55),
    });
  }
}

function drawStars() {
  noStroke();
  for (let s of bgStars) {
    let twinkle = sin(frameCount * s.twinkleSpeed + s.phase) * 0.4 + 0.6;
    let a = s.baseAlpha * twinkle;
    fill(s.hueVal, s.sat, s.brightness, a);
    ellipse(s.x, s.y, s.size);
    if (s.size > 1.5) {
      fill(s.hueVal, s.sat * 0.5, s.brightness, a * 0.12);
      ellipse(s.x, s.y, s.size * 3.5);
    }
  }
}

// ===== SHOOTING STARS =====
function updateShootingStars() {
  if (random() < 0.0006) {
    let dir = random() > 0.5 ? 1 : -1;
    shootingStars.push({
      x: dir > 0 ? random(width * 0.05, width * 0.5) : random(width * 0.5, width * 0.95),
      y: random(height * 0.03, height * 0.35),
      angle: random(PI * 0.05, PI * 0.35) * dir + (dir < 0 ? PI : 0),
      speed: random(6, 18),
      life: 1.0,
      decay: random(0.012, 0.035),
      len: random(40, 120),
      hueVal: random() < 0.6 ? 0 : random([200, 40, 180]),
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
    strokeWeight(1.5);
    stroke(ss.hueVal, 5, 100, ss.life * 70);
    line(ss.x, ss.y, lerp(ss.x, tailX, 0.15), lerp(ss.y, tailY, 0.15));
    strokeWeight(0.7);
    stroke(ss.hueVal, 5, 100, ss.life * 25);
    line(lerp(ss.x, tailX, 0.15), lerp(ss.y, tailY, 0.15), tailX, tailY);
    noStroke();
    fill(ss.hueVal, 5, 100, ss.life * 18);
    ellipse(ss.x, ss.y, 4);
  }
}

// ===== TREELINE =====
function generateTreeline() {
  treeline = [];
  let layers = [
    { yBase: 0.90, heightMin: 0.04, heightMax: 0.12, alpha: 15, detail: 0.007 },
    { yBase: 0.87, heightMin: 0.05, heightMax: 0.16, alpha: 10, detail: 0.004 },
    { yBase: 0.83, heightMin: 0.03, heightMax: 0.10, alpha: 6,  detail: 0.003 },
  ];
  for (let layer of layers) {
    let points = [];
    let noiseOff = random(1000);
    for (let x = -10; x <= width + 10; x += 4) {
      let hill = noise(noiseOff + x * layer.detail) * (layer.heightMax - layer.heightMin) + layer.heightMin;
      let crowns = noise(noiseOff + 500 + x * 0.03) * 0.04;
      let fine = noise(noiseOff + 1000 + x * 0.08) * 0.012;
      let spike = 0;
      if (noise(noiseOff + 2000 + x * 0.015) > 0.62) spike = noise(noiseOff + 3000 + x * 0.06) * 0.05;
      points.push({ x, y: (layer.yBase - hill - crowns - fine - spike) * height });
    }
    treeline.push({ points, alpha: layer.alpha });
  }
}

function drawTreeline() {
  noStroke();
  for (let i = treeline.length - 1; i >= 0; i--) {
    let layer = treeline[i];
    fill(0, 0, 0, layer.alpha);
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
  for (let x = -10; x <= width + 10; x += 3) {
    groundLine.push({ x, y: height * 0.90 + noise(noiseOff + x * 0.005) * height * 0.025 });
  }
}

function getGroundY(px) {
  for (let i = 0; i < groundLine.length - 1; i++) {
    if (groundLine[i].x <= px && groundLine[i + 1].x > px) {
      let t = (px - groundLine[i].x) / (groundLine[i + 1].x - groundLine[i].x);
      return lerp(groundLine[i].y, groundLine[i + 1].y, t);
    }
  }
  return height * 0.90;
}

function drawGround() {
  noStroke();
  fill(0, 0, 0, 100);
  beginShape();
  vertex(0, height);
  for (let p of groundLine) vertex(p.x, p.y);
  vertex(width, height);
  endShape(CLOSE);
}

// ===== PLANT =====
class Plant {
  constructor(x) {
    this.baseX = x;
    this.baseY = getGroundY(x);
    this.growth = 0;
    this.maxHeight = random(80, 220);
    this.segments = Math.floor(random(10, 18));
    this.swayPhase = random(TWO_PI);
    this.swayAmp = random(0.02, 0.05);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-20, 20) + 360) % 360;
    this.hue2 = (this.hueVal + random(50, 90)) % 360;
    this.branches = [];
    this.noiseOff = random(1000);
    this.alive = true;
    this.lifespan = random(1800, 4000);
    this.age = 0;
    this.dying = false;
    this.deathAlpha = 1;
    this.hasTip = random() < 0.7;
    this.tipSize = random(3, 9);

    for (let i = 0; i < this.segments; i++) {
      if (random() < 0.35 && i > 2) {
        this.branches.push({
          segIdx: i,
          side: random() > 0.5 ? 1 : -1,
          len: random(15, 55),
          angle: random(0.3, 1.0),
          curl: random(-0.3, 0.3),
          hasLeaf: random() < 0.7,
          leafSize: random(3, 8),
          leafHue: (this.hue2 + random(-20, 20) + 360) % 360,
        });
      }
    }
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.004, 1);
    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) { this.deathAlpha -= 0.002; if (this.deathAlpha <= 0) this.alive = false; }
    if (this.growth > 0.8 && random() < 0.004 && !this.dying) {
      let tip = this.getTipPos();
      pollen.push(new Pollen(tip.x, tip.y, this.hueVal));
    }
  }

  getTipPos() {
    let pts = this.getPoints();
    return pts[pts.length - 1] || { x: this.baseX, y: this.baseY };
  }

  getPoints() {
    let pts = [{ x: this.baseX, y: this.baseY }];
    let vis = Math.floor(this.segments * this.growth);
    for (let i = 1; i <= vis; i++) {
      let t = i / this.segments;
      let segH = (this.maxHeight / this.segments) * this.growth;
      let sway = sin(frameCount * 0.007 + this.swayPhase + t * 2) * this.swayAmp * this.maxHeight * t;
      sway += windX * t * 20;
      let warp = (noise(this.noiseOff + t * 3, globalTime * 0.5) - 0.5) * 10 * t;
      pts.push({ x: this.baseX + sway + warp, y: this.baseY - segH * i });
    }
    return pts;
  }

  draw() {
    let pts = this.getPoints();
    if (pts.length < 2) return;
    let a = this.deathAlpha;

    // Stem — two passes: glow + core
    noFill();
    stroke(this.hueVal, 40, 50, 8 * a);
    strokeWeight(3);
    beginShape();
    for (let p of pts) curveVertex(p.x, p.y);
    curveVertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
    endShape();

    stroke(this.hueVal, 50, 80, 16 * a);
    strokeWeight(1);
    beginShape();
    for (let p of pts) curveVertex(p.x, p.y);
    curveVertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
    endShape();

    // Branches
    for (let br of this.branches) {
      if (br.segIdx >= pts.length) continue;
      let o = pts[br.segIdx];
      let bAngle = -HALF_PI + br.side * br.angle + sin(frameCount * 0.005 + br.segIdx) * 0.1 + windX * 0.5 * br.side;
      let bLen = br.len * this.growth;
      let endX = o.x + cos(bAngle) * bLen;
      let endY = o.y + sin(bAngle) * bLen;

      stroke(this.hue2, 35, 55, 10 * a);
      strokeWeight(0.8);
      line(o.x, o.y, endX, endY);

      if (br.hasLeaf && this.growth > 0.5) {
        noStroke();
        let lp = sin(frameCount * 0.008 + br.segIdx * 2) * 0.2 + 0.8;
        let ls = br.leafSize * lp * this.growth;
        fill(br.leafHue, 55, 70, 20 * a);
        ellipse(endX, endY, ls, ls * 1.6);
      }
    }

    // Glowing tip
    if (this.hasTip && this.growth > 0.7) {
      let tip = pts[pts.length - 1];
      let pulse = sin(frameCount * 0.015 + this.swayPhase) * 0.35 + 0.65;
      noStroke();
      fill(this.hueVal, 25, 100, 8 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize * 3);
      fill(this.hueVal, 30, 100, 25 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize);
      fill(0, 0, 100, 15 * pulse * a);
      ellipse(tip.x, tip.y, this.tipSize * 0.3);
    }
  }
}

// ===== FLOWER =====
class Flower {
  constructor(x) {
    this.x = x;
    this.baseY = getGroundY(x);
    this.stemHeight = random(50, 130);
    this.bloom = 0;
    this.bloomCycle = random(600, 1400);
    this.petalCount = Math.floor(random(5, 9));
    this.petalLen = random(12, 28);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-15, 15) + 360) % 360;
    this.hue2 = (this.hueVal + random(60, 120)) % 360;
    this.stemHue = (120 + random(-30, 30) + 360) % 360;
    this.phase = random(TWO_PI);
    this.alive = true;
    this.age = 0;
    this.lifespan = random(2000, 5000);
    this.deathAlpha = 1;
    this.dying = false;
    this.growth = 0;
    this.rotSpeed = random(0.0005, 0.0015) * (random() > 0.5 ? 1 : -1);
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.003, 1);
    let cyclePos = (frameCount + this.phase * 100) % this.bloomCycle;
    let t = cyclePos / this.bloomCycle;
    let target = t < 0.5 ? smoothstep(0, 0.5, t) : smoothstep(1, 0.5, t);
    this.bloom = lerp(this.bloom, target, 0.02);

    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) { this.deathAlpha -= 0.0015; if (this.deathAlpha <= 0) this.alive = false; }
    if (this.bloom > 0.7 && random() < 0.006 && !this.dying) {
      let h = this.getHeadPos();
      pollen.push(new Pollen(h.x + random(-8, 8), h.y + random(-8, 8), this.hueVal));
    }
  }

  getHeadPos() {
    let sway = sin(frameCount * 0.005 + this.phase) * 8 + windX * 15;
    return { x: this.x + sway, y: this.baseY - this.stemHeight * this.growth };
  }

  draw() {
    let a = this.deathAlpha;
    let sway = sin(frameCount * 0.005 + this.phase) * 8 + windX * 15;
    let hx = this.x + sway;
    let hy = this.baseY - this.stemHeight * this.growth;

    // Stem
    stroke(this.stemHue, 40, 45, 14 * a);
    strokeWeight(1.3);
    noFill();
    beginShape();
    curveVertex(this.x, this.baseY); curveVertex(this.x, this.baseY);
    curveVertex(this.x + sway * 0.3, this.baseY - this.stemHeight * 0.4 * this.growth);
    curveVertex(hx, hy); curveVertex(hx, hy);
    endShape();

    if (this.growth < 0.3) return;

    push();
    translate(hx, hy);
    let rot = frameCount * this.rotSpeed;

    // Petals
    for (let p = 0; p < this.petalCount; p++) {
      let base = (TWO_PI / this.petalCount) * p - HALF_PI + rot;
      let spread = base * (0.3 + this.bloom * 0.7);
      let pLen = this.petalLen * (0.3 + this.bloom * 0.7) * this.growth;
      let ph = lerpHue(this.hueVal, this.hue2, p / this.petalCount);

      noStroke();
      push();
      rotate(spread);
      fill(ph, 60, 85, 20 * a);
      ellipse(0, -pLen * 0.5, pLen * 0.4, pLen);
      fill(ph, 40, 100, 10 * a);
      ellipse(0, -pLen * 0.4, pLen * 0.15, pLen * 0.6);
      pop();
    }

    // Center
    let cp = sin(frameCount * 0.02 + this.phase) * 0.2 + 0.8;
    noStroke();
    fill(this.hueVal, 25, 100, 5 * this.bloom * a);
    ellipse(0, 0, this.petalLen * 1.5 * this.bloom);
    fill(this.hueVal, 30, 100, 30 * this.bloom * cp * a);
    ellipse(0, 0, 6 * this.growth);
    fill(0, 0, 100, 20 * this.bloom * cp * a);
    ellipse(0, 0, 2 * this.growth);
    pop();
  }
}

// ===== MUSHROOM =====
class Mushroom {
  constructor(x) {
    this.x = x;
    this.baseY = getGroundY(x);
    this.capWidth = random(16, 38);
    this.capHeight = random(10, 18);
    this.stemH = random(12, 35);
    this.stemW = random(3, 7);
    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-20, 20) + 360) % 360;
    this.hue2 = (this.hueVal + 60) % 360;
    this.phase = random(TWO_PI);
    this.growth = 0;
    this.alive = true;
    this.age = 0;
    this.lifespan = random(2500, 5500);
    this.dying = false;
    this.deathAlpha = 1;
    this.spots = [];
    for (let i = 0; i < Math.floor(random(3, 7)); i++) {
      this.spots.push({
        angle: random(-PI * 0.8, PI * 0.8),
        dist: random(0.2, 0.8),
        size: random(1.5, 4),
      });
    }
  }

  update() {
    this.age++;
    this.growth = min(this.growth + 0.004, 1);
    if (this.age > this.lifespan && !this.dying) this.dying = true;
    if (this.dying) { this.deathAlpha -= 0.002; if (this.deathAlpha <= 0) this.alive = false; }
    if (this.growth > 0.9 && random() < 0.008 && !this.dying) {
      let capTop = this.baseY - this.stemH * this.growth - this.capHeight * this.growth * 0.4;
      pollen.push(new Pollen(
        this.x + random(-this.capWidth * 0.3, this.capWidth * 0.3), capTop,
        this.hueVal, true
      ));
    }
  }

  draw() {
    let a = this.deathAlpha;
    let g = this.growth;
    let pulse = sin(frameCount * 0.01 + this.phase) * 0.18 + 0.82;
    let capY = this.baseY - this.stemH * g;

    noStroke();
    // Ground glow
    fill(this.hueVal, 40, 70, 6 * pulse * a * g);
    ellipse(this.x, this.baseY, this.capWidth * 3, 8);

    // Stem
    fill(this.hueVal, 20, 40, 20 * a);
    rectMode(CENTER);
    rect(this.x, this.baseY - this.stemH * g * 0.5, this.stemW * g, this.stemH * g, 2);
    fill(this.hueVal, 30, 75, 5 * pulse * a);
    rect(this.x, this.baseY - this.stemH * g * 0.5, this.stemW * g * 0.4, this.stemH * g, 2);
    rectMode(CORNER);

    // Cap
    fill(this.hueVal, 50, 55, 25 * a);
    arc(this.x, capY, this.capWidth * g, this.capHeight * g * 2, PI, TWO_PI, CHORD);
    fill(this.hueVal, 35, 85, 10 * pulse * a);
    arc(this.x, capY, this.capWidth * g * 0.7, this.capHeight * g * 1.4, PI, TWO_PI, CHORD);

    // Spots
    for (let spot of this.spots) {
      let sx = this.x + cos(spot.angle) * this.capWidth * 0.35 * spot.dist * g;
      let sy = capY - abs(sin(spot.angle)) * this.capHeight * 0.4 * spot.dist * g;
      let sp = sin(frameCount * 0.015 + spot.angle * 2 + this.phase) * 0.25 + 0.75;
      fill(this.hue2, 30, 100, 18 * sp * a);
      ellipse(sx, sy, spot.size * g);
    }

    // Top aura
    fill(this.hueVal, 25, 100, 4 * pulse * a * g);
    ellipse(this.x, capY - this.capHeight * g * 0.3, this.capWidth * 2 * g, this.capHeight * 2 * g);
  }
}

// ===== FIREFLY =====
class Firefly {
  constructor() {
    this.x = random(width);
    this.y = random(height * 0.4, height * 0.92);
    this.vx = 0; this.vy = 0;
    this.hueVal = random([50, 60, 80, 120, 40]);
    this.size = random(1.5, 3.5);
    this.phase = random(TWO_PI);
    this.glowSpeed = random(0.015, 0.04);
    this.noiseX = random(1000);
    this.noiseY = random(1000);
    this.wanderSpeed = random(0.3, 0.8);
  }

  update() {
    let nx = noise(this.noiseX, globalTime * 2) - 0.5;
    let ny = noise(this.noiseY, globalTime * 2) - 0.5;
    this.vx += nx * 0.15 + windX * 0.3;
    this.vy += ny * 0.15 + windY * 0.1;
    this.vx *= 0.95; this.vy *= 0.95;
    let spd = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > this.wanderSpeed) { this.vx = (this.vx / spd) * this.wanderSpeed; this.vy = (this.vy / spd) * this.wanderSpeed; }
    this.x += this.vx; this.y += this.vy;

    let dm = dist(this.x, this.y, mouseX, mouseY);
    if (dm < 200 && dm > 20) {
      this.vx += (mouseX - this.x) * 0.0003;
      this.vy += (mouseY - this.y) * 0.0003;
    }

    if (this.x < -20) this.x = width + 20;
    if (this.x > width + 20) this.x = -20;
    if (this.y < height * 0.2) this.vy += 0.02;
    if (this.y > height * 0.95) this.vy -= 0.05;
    this.noiseX += 0.005; this.noiseY += 0.005;
  }

  draw() {
    let glow = sin(frameCount * this.glowSpeed + this.phase);
    let b = glow > 0.2 ? map(glow, 0.2, 1, 0.3, 1) : 0.05;
    noStroke();
    fill(this.hueVal, 40, 100, 4 * b);
    ellipse(this.x, this.y, this.size * 10);
    fill(this.hueVal, 50, 100, 12 * b);
    ellipse(this.x, this.y, this.size * 4);
    fill(this.hueVal, 30, 100, 40 * b);
    ellipse(this.x, this.y, this.size);
    fill(0, 0, 100, 25 * b);
    ellipse(this.x, this.y, this.size * 0.4);
  }
}

// ===== POLLEN =====
class Pollen {
  constructor(x, y, hueVal, isSpore) {
    this.x = x; this.y = y;
    this.hueVal = hueVal;
    this.size = isSpore ? random(1, 2.5) : random(1.5, 3);
    this.life = 1;
    this.decay = random(0.003, 0.008);
    this.vx = random(-0.3, 0.3);
    this.vy = random(-0.4, -0.1);
    this.isSpore = isSpore;
    this.noiseOff = random(1000);
  }

  update() {
    this.vx += windX * 0.05 + (noise(this.noiseOff, globalTime * 3) - 0.5) * 0.04;
    this.vy += (noise(this.noiseOff + 50, globalTime * 3) - 0.5) * 0.04;
    if (this.isSpore) this.vy -= 0.012;
    this.x += this.vx; this.y += this.vy;
    this.life -= this.decay;
    this.noiseOff += 0.02;
  }

  draw() {
    noStroke();
    fill(this.hueVal, 30, 100, this.life * 14);
    ellipse(this.x, this.y, this.size);
    fill(this.hueVal, 20, 100, this.life * 5);
    ellipse(this.x, this.y, this.size * 2.5);
  }

  isDead() { return this.life <= 0; }
}

// ===== SPAWN =====
function spawnPlant() {
  if (plants.length >= MAX_PLANTS) return;
  plants.push(new Plant(random(width * 0.05, width * 0.95)));
  if (audioReady) playPlantSound();
}
function spawnFlower() {
  if (flowers.length >= MAX_FLOWERS) return;
  flowers.push(new Flower(random(width * 0.08, width * 0.92)));
  if (audioReady) playBellSound();
}
function spawnMushroom() {
  if (mushrooms.length >= MAX_MUSHROOMS) return;
  mushrooms.push(new Mushroom(random(width * 0.08, width * 0.92)));
  if (audioReady) playDroneSound();
}
function spawnFirefly() {
  if (fireflies.length >= MAX_FIREFLIES) return;
  fireflies.push(new Firefly());
}

// ===== DRAW =====
function draw() {
  globalTime += 0.001;
  background(0);

  // Wind
  let mx = mouseX - lastMouseX;
  let my = mouseY - lastMouseY;
  windX = lerp(windX, constrain(mx * 0.01, -0.5, 0.5), 0.02);
  windY = lerp(windY, constrain(my * 0.005, -0.2, 0.2), 0.02);
  windX += (noise(globalTime * 200) - 0.5) * 0.002;
  lastMouseX = mouseX; lastMouseY = mouseY;

  drawStars();
  updateShootingStars();

  if (awaitingClick) {
    drawTreeline();
    drawGround();
    drawStartPrompt();
    return;
  }

  // Auto-spawn — gentle pace
  spawnTimer++;
  if (spawnTimer % 360 === 0) spawnPlant();
  if (spawnTimer % 500 === 0) spawnFlower();
  if (spawnTimer % 650 === 0) spawnMushroom();
  if (spawnTimer % 150 === 0) spawnFirefly();

  drawTreeline();
  drawGround();

  // Draw organisms
  for (let i = mushrooms.length - 1; i >= 0; i--) {
    mushrooms[i].update(); mushrooms[i].draw();
    if (!mushrooms[i].alive) mushrooms.splice(i, 1);
  }
  for (let i = plants.length - 1; i >= 0; i--) {
    plants[i].update(); plants[i].draw();
    if (!plants[i].alive) plants.splice(i, 1);
  }
  for (let i = flowers.length - 1; i >= 0; i--) {
    flowers[i].update(); flowers[i].draw();
    if (!flowers[i].alive) flowers.splice(i, 1);
  }
  for (let ff of fireflies) { ff.update(); ff.draw(); }

  // Pollen
  for (let i = pollen.length - 1; i >= 0; i--) {
    pollen[i].update(); pollen[i].draw();
    if (pollen[i].isDead()) pollen.splice(i, 1);
  }
  while (pollen.length > 200) pollen.shift();
}

// ===== AUDIO ENGINE =====
function initAudio() {
  if (audioReady) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let sb = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    let ss = audioCtx.createBufferSource();
    ss.buffer = sb; ss.connect(audioCtx.destination); ss.start(0);
    audioCtx.resume();

    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-20, audioCtx.currentTime);
    compressor.knee.setValueAtTime(25, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.005, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.2, audioCtx.currentTime);
    compressor.connect(audioCtx.destination);

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 10);

    dryGain = audioCtx.createGain();
    dryGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

    // Reverb
    let irLen = Math.min(Math.floor(audioCtx.sampleRate * 4), 176400);
    let ir = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      let data = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.4);
    }
    let convolver = audioCtx.createConvolver();
    convolver.buffer = ir;
    wetGain = audioCtx.createGain();
    wetGain.gain.setValueAtTime(0.55, audioCtx.currentTime);

    // Delay
    delayNode = audioCtx.createDelay(3.0);
    delayNode.delayTime.setValueAtTime(1.3, audioCtx.currentTime);
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.setValueAtTime(0.3, audioCtx.currentTime);
    delayFilter = audioCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(800, audioCtx.currentTime);
    delayGain = audioCtx.createGain();
    delayGain.gain.setValueAtTime(0.25, audioCtx.currentTime);

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

function midiToFreq(note) { return 440 * Math.pow(2, (note - 69) / 12); }

// --- PLANT SOUND: warm breathy pad with gentle FM ---
function playPlantSound() {
  let note = SCALE_NOTES[Math.floor(random(SCALE_NOTES.length))];
  let now = audioCtx.currentTime;
  let freq = midiToFreq(note);
  let vel = random(0.2, 0.45);

  let osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, now);
  let osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 1.003, now);

  // Gentle FM shimmer
  let mod = audioCtx.createOscillator();
  mod.type = 'sine';
  mod.frequency.setValueAtTime(freq * 2, now);
  let modG = audioCtx.createGain();
  modG.gain.setValueAtTime(8 * vel, now);
  modG.gain.exponentialRampToValueAtTime(0.5, now + 4);
  mod.connect(modG);
  modG.connect(osc1.frequency);

  let filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400 + vel * 600, now);
  filter.frequency.linearRampToValueAtTime(250, now + 6);

  let env = audioCtx.createGain();
  env.gain.setValueAtTime(0.001, now);
  env.gain.linearRampToValueAtTime(vel * 0.06, now + 3);
  env.gain.exponentialRampToValueAtTime(0.001, now + 10);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(env);
  env.connect(masterGain);

  osc1.start(now); osc2.start(now); mod.start(now);
  osc1.stop(now + 11); osc2.stop(now + 11); mod.stop(now + 11);
}

// --- FLOWER SOUND: crystalline bell with harmonics ---
function playBellSound() {
  let note = SCALE_NOTES[Math.floor(random(4, SCALE_NOTES.length))];
  let now = audioCtx.currentTime;
  let freq = midiToFreq(note);
  let vel = random(0.15, 0.35);

  // Bell = sharp attack, quick decay, several harmonics
  let partials = [1, 2.756, 4.09, 5.4]; // bell-like partials
  let decays = [8, 5, 3, 2];

  let mixer = audioCtx.createGain();
  mixer.gain.setValueAtTime(vel * 0.04, now);
  mixer.connect(masterGain);

  for (let i = 0; i < partials.length; i++) {
    let osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * partials[i], now);

    let env = audioCtx.createGain();
    let amp = vel * (1 / (i + 1)) * 0.8;
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(amp, now + 0.02); // fast attack
    env.gain.exponentialRampToValueAtTime(0.001, now + decays[i]);

    osc.connect(env);
    env.connect(mixer);
    osc.start(now);
    osc.stop(now + decays[i] + 0.1);
  }
}

// --- MUSHROOM SOUND: deep evolving drone ---
function playDroneSound() {
  let note = SCALE_NOTES[Math.floor(random(3))]; // low notes only
  let now = audioCtx.currentTime;
  let freq = midiToFreq(note);
  let vel = random(0.15, 0.3);

  let osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, now);

  let sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq / 2, now);

  // Slow LFO on filter for evolving quality
  let lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.15, now);
  let lfoG = audioCtx.createGain();
  lfoG.gain.setValueAtTime(200, now);
  lfo.connect(lfoG);

  let filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, now);
  filter.Q.setValueAtTime(2, now);
  lfoG.connect(filter.frequency);

  let env = audioCtx.createGain();
  env.gain.setValueAtTime(0.001, now);
  env.gain.linearRampToValueAtTime(vel * 0.08, now + 4);
  env.gain.setValueAtTime(vel * 0.08, now + 8);
  env.gain.exponentialRampToValueAtTime(0.001, now + 14);

  osc1.connect(filter);
  sub.connect(filter);
  filter.connect(env);
  env.connect(masterGain);

  osc1.start(now); sub.start(now); lfo.start(now);
  osc1.stop(now + 15); sub.stop(now + 15); lfo.stop(now + 15);
}

// ===== HELPERS =====
function lerpHue(h1, h2, t) {
  let d = h2 - h1;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (h1 + d * t + 360) % 360;
}

function smoothstep(e0, e1, x) {
  let t = constrain((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function toggleFullscreen() {
  let doc = document.documentElement;
  if (!document.fullscreenElement) doc.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

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
    for (let i = 0; i < 20; i++) spawnFirefly();
    setTimeout(() => spawnPlant(), 800);
    setTimeout(() => spawnFlower(), 2500);
    setTimeout(() => spawnPlant(), 4000);
    setTimeout(() => spawnMushroom(), 5500);
    setTimeout(() => spawnPlant(), 7500);
    setTimeout(() => spawnFlower(), 9500);
    setTimeout(() => spawnMushroom(), 12000);
    setTimeout(() => spawnPlant(), 15000);
    return false;
  }
  return false;
}

function mousePressed() {
  if (awaitingClick) return;
  let r = random();
  if (r < 0.4) spawnPlant();
  else if (r < 0.7) spawnFlower();
  else spawnMushroom();
  // Small firefly burst
  for (let i = 0; i < 3; i++) {
    let ff = new Firefly();
    ff.x = mouseX + random(-25, 25);
    ff.y = mouseY + random(-25, 25);
    fireflies.push(ff);
  }
  while (fireflies.length > MAX_FIREFLIES + 10) fireflies.shift();
}

function doubleClicked() { toggleFullscreen(); return false; }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initStars();
  generateTreeline();
  generateGround();
}
