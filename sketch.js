// ============================================================
// NIGHT GARDEN — Self-generating sacred geometry in a night sky
// ============================================================
// No MIDI needed. Infinite, autonomous, meditative.
// Ornate mandala creatures drift above a dark treeline.
// Double-click or F for fullscreen.
// ============================================================

// ===== CONFIG =====
const MAX_CREATURES = 5;
const FADE_IN_FRAMES = 600; // 10 seconds to fully materialize
const SPAWN_MIN = 300;   // frames between spawns (5 sec at 60fps)
const SPAWN_MAX = 720;   // (12 sec)
const CREATURE_LIFE = 900; // frames a creature lives — longer fade
const NOTE_HOLD = 240;    // frames before releasing (4 sec)

// Low register — Eno/Lanois warm ambient tones
// D major pentatonic, octaves 2-4 only (no high pings)
const SCALE = [38, 42, 45, 50, 54, 57, 62];

const PALETTES = [
  { base: 270, spread: 60 },
  { base: 200, spread: 50 },
  { base: 320, spread: 40 },
  { base: 160, spread: 70 },
  { base: 30,  spread: 50 },
  { base: 0,   spread: 360 },
];

// ===== STATE =====
let creatures = [];
let particles = [];
let ripples = [];
let bgStars = [];
let shootingStars = [];
let treeline = [];
let driftFieldTime = 0;
let nextSpawn = 120;
let spawnTimer = 0;
// Audio
let audioCtx, masterGain, compressor, convolver, dryGain, wetGain;
let delayNode, delayFeedbackNode, delayFilter, delayGain;
let audioReady = false;
let voices = new Map();
let awaitingClick = true;

// ===== SETUP =====
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  angleMode(RADIANS);
  noCursor();
  textFont('monospace');

  // Stars — dense starfield
  for (let i = 0; i < 250; i++) {
    bgStars.push({
      x: random(width), y: random(height * 0.88),
      size: random(0.3, 2.2),
      phase: random(TWO_PI),
      twinkleSpeed: random(0.005, 0.025),
      hueVal: random() < 0.7 ? 0 : random([210, 30, 350, 60]), // mostly white, some blue/warm/red tints
      sat: random() < 0.7 ? 0 : random(15, 35),
      brightness: random(50, 100),
      baseAlpha: random(15, 55),
    });
  }

  // Generate treeline
  generateTreeline();

  // Unified start handler — works on both mobile and desktop
  function startGarden() {
    if (!awaitingClick) return;
    awaitingClick = false;  // Always unlock visuals, even if audio fails
    try {
      initAudio();
    } catch (e) {
      console.error('Audio init error:', e);
    }
  }

  // Native DOM listeners — p5 touchStarted is unreliable on iOS
  document.addEventListener('touchstart', startGarden, { passive: true });
  document.addEventListener('touchend', startGarden, { passive: true });
  document.addEventListener('click', startGarden);
  document.addEventListener('pointerdown', startGarden);
}

// ===== TREELINE =====
function generateTreeline() {
  treeline = [];
  // Multiple layers of trees at different depths
  let layers = [
    { yBase: 0.92, heightMin: 0.04, heightMax: 0.10, alpha: 12, detail: 0.008 },
    { yBase: 0.88, heightMin: 0.06, heightMax: 0.16, alpha: 8,  detail: 0.005 },
    { yBase: 0.85, heightMin: 0.04, heightMax: 0.12, alpha: 5,  detail: 0.003 },
  ];

  for (let layer of layers) {
    let points = [];
    let noiseOff = random(1000);
    for (let x = -10; x <= width + 10; x += 3) {
      // Large-scale rolling hills
      let hill = noise(noiseOff + x * layer.detail) * (layer.heightMax - layer.heightMin) + layer.heightMin;
      // Medium detail — individual tree crowns
      let crowns = noise(noiseOff + 500 + x * 0.03) * 0.04;
      // Fine detail — branches, texture
      let fine = noise(noiseOff + 1000 + x * 0.08) * 0.015;
      // Occasional tall tree spikes
      let spike = 0;
      if (noise(noiseOff + 2000 + x * 0.015) > 0.62) {
        spike = noise(noiseOff + 3000 + x * 0.06) * 0.05;
      }
      let yNorm = layer.yBase - hill - crowns - fine - spike;
      points.push({ x: x, y: yNorm * height });
    }
    treeline.push({ points, alpha: layer.alpha });
  }
}

function drawTreeline() {
  noStroke();
  for (let layer of treeline) {
    fill(0, 0, 0, layer.alpha);
    beginShape();
    vertex(0, height);
    for (let p of layer.points) {
      vertex(p.x, p.y);
    }
    vertex(width, height);
    endShape(CLOSE);
  }
}

// ===== DRAW =====
function draw() {
  driftFieldTime += 0.001;

  // Pure black sky
  background(0);

  drawBgStars();
  updateShootingStars();

  if (awaitingClick) {
    drawTreeline();
    drawStartPrompt();
    return;
  }

  // Auto-spawn creatures
  spawnTimer++;
  if (spawnTimer >= nextSpawn && creatures.length < MAX_CREATURES) {
    autoSpawn();
    spawnTimer = 0;
    nextSpawn = Math.floor(random(SPAWN_MIN, SPAWN_MAX));
  }

  // Ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].draw();
    if (ripples[i].isDead()) ripples.splice(i, 1);
  }

  // Connections
  drawConnections();

  // Creatures
  for (let i = creatures.length - 1; i >= 0; i--) {
    creatures[i].update();
    creatures[i].draw();
    if (!creatures[i].alive) creatures.splice(i, 1);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].isDead()) particles.splice(i, 1);
  }
  while (particles.length > 300) particles.shift();

  // Treeline drawn on top — silhouette over everything
  drawTreeline();
}

// ===== AUTO-SPAWN =====
function autoSpawn() {
  let note = SCALE[Math.floor(random(SCALE.length))];
  let vel = Math.floor(random(35, 75));

  // Spawn across the full sky — wide open, spacious
  let px = random(width * 0.05, width * 0.95);
  let py = random(height * 0.06, height * 0.7);

  // Play sound
  if (audioReady) playNote(note, vel);

  // Create creature
  let creature = new Creature(note, vel, px, py);
  creatures.push(creature);
  ripples.push(new Ripple(px, py, creature.hueVal));

  // Auto-release after hold time
  let holdFrames = Math.floor(random(NOTE_HOLD, NOTE_HOLD * 3));
  setTimeout(() => {
    creature.releasing = true;
    creature.releaseFrame = frameCount;
    if (audioReady) releaseNote(note);
  }, (holdFrames / 60) * 1000);
}

// ===== AUDIO =====
function initAudio() {
  if (audioReady) return;
  try {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // iOS unlock: play a silent buffer to force audio hardware on
  let silentBuf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
  let silentSrc = audioCtx.createBufferSource();
  silentSrc.buffer = silentBuf;
  silentSrc.connect(audioCtx.destination);
  silentSrc.start(0);

  // Also call resume (needed on some iOS versions)
  audioCtx.resume();

  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
  compressor.knee.setValueAtTime(20, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.15, audioCtx.currentTime);
  compressor.connect(audioCtx.destination);

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.5, audioCtx.currentTime);

  dryGain = audioCtx.createGain();
  dryGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

  // Long reverb — cathedral-like ambient wash
  let irLen = Math.min(Math.floor(audioCtx.sampleRate * 4), 176400);
  let ir = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    let data = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.4);
    }
  }
  convolver = audioCtx.createConvolver();
  convolver.buffer = ir;
  wetGain = audioCtx.createGain();
  wetGain.gain.setValueAtTime(0.7, audioCtx.currentTime);

  // Long delay — spacious Lanois-style
  delayNode = audioCtx.createDelay(3.0);
  delayNode.delayTime.setValueAtTime(1.2, audioCtx.currentTime);
  delayFeedbackNode = audioCtx.createGain();
  delayFeedbackNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
  delayFilter = audioCtx.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.setValueAtTime(900, audioCtx.currentTime);
  delayGain = audioCtx.createGain();
  delayGain.gain.setValueAtTime(0.35, audioCtx.currentTime);

  masterGain.connect(dryGain);
  dryGain.connect(compressor);
  masterGain.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(compressor);
  masterGain.connect(delayNode);
  delayNode.connect(delayFilter);
  delayFilter.connect(delayFeedbackNode);
  delayFeedbackNode.connect(delayNode);
  delayFilter.connect(delayGain);
  delayGain.connect(compressor);

  audioReady = true;
  } catch (e) {
    console.error('Audio init failed:', e);
  }
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function playNote(note, velocity) {
  if (voices.has(note)) releaseNote(note);

  let now = audioCtx.currentTime;
  let freq = midiToFreq(note);
  let vel = velocity / 127;

  // Fundamental — warm sine
  let carrier = audioCtx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(freq, now);

  // Detuned unison — slow chorus
  let carrier2 = audioCtx.createOscillator();
  carrier2.type = 'sine';
  carrier2.frequency.setValueAtTime(freq * 1.003, now);

  let carrier3 = audioCtx.createOscillator();
  carrier3.type = 'sine';
  carrier3.frequency.setValueAtTime(freq * 0.997, now);

  // Sub octave — warmth foundation
  let sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq / 2, now);
  let subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0.12 * vel, now);
  sub.connect(subGain);

  // Perfect fifth overtone — harmonic richness
  let fifth = audioCtx.createOscillator();
  fifth.type = 'sine';
  fifth.frequency.setValueAtTime(freq * 1.498, now); // slightly flat fifth for warmth
  let fifthGain = audioCtx.createGain();
  fifthGain.gain.setValueAtTime(0.04 * vel, now);
  fifthGain.gain.exponentialRampToValueAtTime(Math.max(0.02 * vel, 0.001), now + 3);
  fifth.connect(fifthGain);

  // Gentle FM — very subtle, just adds shimmer not harshness
  let modulator = audioCtx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(freq * 2, now);
  let modGain = audioCtx.createGain();
  modGain.gain.setValueAtTime(20 * vel, now);
  modGain.gain.exponentialRampToValueAtTime(Math.max(3 * vel, 0.01), now + 2.5);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  // Low filter — no brightness, all warmth
  let filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600 + vel * 800, now);
  filter.Q.setValueAtTime(0.5, now);

  // Slow attack, long sustain — pad-like envelope
  let voiceGain = audioCtx.createGain();
  voiceGain.gain.setValueAtTime(0.001, now);
  voiceGain.gain.linearRampToValueAtTime(vel * 0.15, now + 2.0);   // 2s attack
  voiceGain.gain.exponentialRampToValueAtTime(Math.max(vel * 0.12, 0.001), now + 6); // slow decay to sustain

  let c2Gain = audioCtx.createGain();
  c2Gain.gain.setValueAtTime(0.5, now);
  carrier2.connect(c2Gain);

  let c3Gain = audioCtx.createGain();
  c3Gain.gain.setValueAtTime(0.5, now);
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
}

function releaseNote(note) {
  let voice = voices.get(note);
  if (!voice) return;
  let now = audioCtx.currentTime;
  let rel = 5.0; // long, ambient release

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

// ===== CREATURE =====
class Creature {
  constructor(note, vel, x, y) {
    this.note = note;
    this.vel = vel / 127;
    this.x = x;
    this.y = y;

    let pal = PALETTES[Math.floor(random(PALETTES.length))];
    this.hueVal = (pal.base + random(-pal.spread / 2, pal.spread / 2) + 360) % 360;
    this.hue2 = (this.hueVal + random(30, 90)) % 360;
    this.hue3 = (this.hueVal + random(120, 180)) % 360;

    this.size = map(vel, 0, 127, 14, 35); // much smaller — distant, intimate
    this.phase = random(TWO_PI);
    this.alive = true;
    this.releasing = false;
    this.releaseFrame = 0;
    this.alpha = 0; // start invisible — fade in
    this.targetAlpha = 100;
    this.birthFrame = frameCount;

    this.noiseX = random(1000);
    this.noiseY = random(1000);

    this.petalCount = Math.floor(random(4, 7));
    this.ringCount = Math.floor(random(2, 4));
    this.satelliteCount = Math.floor(random(2, 5));
    this.rotSpeed = random(0.0005, 0.0015) * (random() > 0.5 ? 1 : -1);
    this.innerRotSpeed = this.rotSpeed * -1.2;
    this.filigreeCount = Math.floor(random(5, 10));
    this.noiseOff = random(1000);
  }

  update() {
    // Multi-layered noise for fluid, organic drift — like jellyfish in current
    let slow  = noise(this.noiseX + driftFieldTime * 0.08, this.y * 0.0005, driftFieldTime * 0.15);
    let med   = noise(this.noiseX + 300 + driftFieldTime * 0.2, this.x * 0.001, driftFieldTime * 0.4);
    let slowY = noise(this.noiseY + driftFieldTime * 0.08, this.x * 0.0005, driftFieldTime * 0.15 + 50);
    let medY  = noise(this.noiseY + 300 + driftFieldTime * 0.2, this.y * 0.001, driftFieldTime * 0.4 + 50);
    this.x += (slow - 0.5) * 0.6 + (med - 0.5) * 0.3;
    this.y += (slowY - 0.5) * 0.6 + (medY - 0.5) * 0.3;
    // Very gentle gravity toward center — keeps creatures from wandering off
    this.x += (width / 2 - this.x) * 0.00015;
    this.y += (height * 0.35 - this.y) * 0.00015;

    this.pulse = sin(frameCount * 0.003 + this.phase) * 0.03 + 0.97;

    // Slow fade in — creatures materialize like apparitions
    let age = frameCount - this.birthFrame;
    if (!this.releasing) {
      let fadeIn = Math.min(age / FADE_IN_FRAMES, 1);
      // Smooth S-curve — invisible, then gently blooms into presence
      let smooth = fadeIn * fadeIn * (3 - 2 * fadeIn); // smoothstep
      this.alpha = this.targetAlpha * smooth;
    } else {
      let releaseAge = frameCount - this.releaseFrame;
      let t = releaseAge / CREATURE_LIFE;
      this.alpha = this.targetAlpha * Math.pow(1 - Math.min(t, 1), 3);
      if (this.alpha <= 0.2) { this.alpha = 0; this.alive = false; }
    }

    if (frameCount % 24 === 0 && this.alpha > 8) {
      particles.push(new Particle(
        this.x + random(-15, 15), this.y + random(-15, 15),
        this.hueVal, this.hue2, this.vel
      ));
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    let sz = this.size * this.pulse;
    let a = this.alpha / 100;
    let t = frameCount;
    if (a < 0.005) { pop(); return; }

    // Noise-warped concentric rings — organic, breathing shapes
    noFill();
    for (let r = 0; r < this.ringCount; r++) {
      let baseR = sz * (0.5 + r * 0.45);
      let ringHue = lerpHue(this.hueVal, this.hue2, r / this.ringCount);
      stroke(ringHue, 35, 100, a * (20 - r * 4));
      strokeWeight(0.4);
      beginShape();
      let steps = 60;
      for (let i = 0; i <= steps; i++) {
        let angle = (TWO_PI / steps) * i;
        let warp = noise(this.noiseOff + r * 10 + cos(angle) * 0.5, sin(angle) * 0.5, driftFieldTime * 0.3);
        let rr = baseR + (warp - 0.5) * sz * 0.15;
        rr += sin(t * 0.003 + this.phase + r * 0.8 + angle * 2) * sz * 0.03;
        curveVertex(cos(angle) * rr, sin(angle) * rr);
      }
      endShape(CLOSE);
    }

    // Flowing petal tendrils
    let petalRot = t * this.rotSpeed;
    noFill();
    for (let p = 0; p < this.petalCount; p++) {
      let baseAngle = (TWO_PI / this.petalCount) * p + petalRot;
      let petalHue = lerpHue(this.hueVal, this.hue3, p / this.petalCount);
      stroke(petalHue, 40, 100, a * 18);
      strokeWeight(0.5);

      let len = sz * 0.8 + sin(t * 0.004 + p * 0.7 + this.phase) * sz * 0.1;
      let curl = noise(this.noiseOff + p * 20, driftFieldTime * 0.4) * 0.6 - 0.3;
      let midR = len * 0.5;
      let midAngle = baseAngle + curl;
      let tipAngle = baseAngle + curl * 0.5;

      beginShape();
      curveVertex(0, 0);
      curveVertex(0, 0);
      curveVertex(cos(midAngle) * midR, sin(midAngle) * midR);
      curveVertex(cos(tipAngle) * len, sin(tipAngle) * len);
      curveVertex(cos(tipAngle) * len, sin(tipAngle) * len);
      endShape();

      noStroke();
      fill(petalHue, 30, 100, a * 14);
      ellipse(cos(tipAngle) * len, sin(tipAngle) * len, 1.5);
    }

    // Inner filigree
    let filiRot = t * this.innerRotSpeed;
    noFill();
    for (let f = 0; f < this.filigreeCount; f++) {
      let angle = (TWO_PI / this.filigreeCount) * f + filiRot;
      let len = sz * 0.3 + noise(this.noiseOff + f, driftFieldTime * 0.3) * sz * 0.1;
      let fHue = lerpHue(this.hue2, this.hue3, f / this.filigreeCount);
      stroke(fHue, 30, 100, a * 10);
      strokeWeight(0.3);
      let curl = sin(t * 0.003 + f * 1.1) * 0.15;
      let mx = cos(angle + curl) * len * 0.5;
      let my = sin(angle + curl) * len * 0.5;
      let ex = cos(angle) * len;
      let ey = sin(angle) * len;
      beginShape();
      curveVertex(0, 0); curveVertex(0, 0);
      curveVertex(mx, my);
      curveVertex(ex, ey); curveVertex(ex, ey);
      endShape();
    }

    // Orbiting satellites
    noStroke();
    for (let s = 0; s < this.satelliteCount; s++) {
      let orbitR = sz * (0.55 + s * 0.2);
      let speed = 0.0015 + s * 0.0005;
      let orbitAngle = t * speed * (s % 2 === 0 ? 1 : -1) + this.phase + s * 1.2;
      let wobble = noise(this.noiseOff + s * 50, driftFieldTime * 0.5) * 0.25 + 0.87;
      let sx = cos(orbitAngle) * orbitR;
      let sy = sin(orbitAngle) * orbitR * wobble;
      let satHue = lerpHue(this.hueVal, this.hue2, s / this.satelliteCount);
      fill(satHue, 35, 100, a * 22);
      ellipse(sx, sy, 1.5);
    }

    // Center glow — soft, diffused
    noStroke();
    fill(this.hueVal, 20, 100, a * 12);
    ellipse(0, 0, sz * 0.3);
    fill(this.hueVal, 15, 100, a * 25);
    ellipse(0, 0, sz * 0.12);
    fill(0, 0, 100, a * 18);
    ellipse(0, 0, sz * 0.05);

    pop();
  }
}

// ===== PARTICLE =====
class Particle {
  constructor(x, y, hueVal, hue2, intensity) {
    this.x = x; this.y = y;
    this.hueVal = lerpHue(hueVal, hue2, random());
    this.size = random(0.5, 1.8) * (intensity || 0.5);
    this.life = 1.0;
    this.decay = random(0.002, 0.006);
    this.noiseX = random(1000);
    this.noiseY = random(1000);
  }

  update() {
    this.x += (noise(this.noiseX, driftFieldTime * 2) - 0.5) * 0.6;
    this.y += (noise(this.noiseY, driftFieldTime * 2) - 0.5) * 0.6;
    this.life -= this.decay;
  }

  draw() {
    noStroke();
    fill(this.hueVal, 30, 100, this.life * 12);
    ellipse(this.x, this.y, this.size);
  }

  isDead() { return this.life <= 0; }
}

// ===== RIPPLE =====
class Ripple {
  constructor(x, y, hueVal) {
    this.x = x; this.y = y;
    this.hueVal = hueVal;
    this.hue2 = (hueVal + random(30, 60)) % 360;
    this.radius = 8;
    this.maxRadius = random(180, 350);
    this.life = 1.0;
    this.dotCount = Math.floor(random(24, 48));
    this.rotOffset = random(TWO_PI);
  }

  update() {
    this.radius += 0.5;
    this.life = Math.pow(1 - (this.radius / this.maxRadius), 2.5);
  }

  draw() {
    noStroke();
    for (let d = 0; d < this.dotCount; d++) {
      let angle = (TWO_PI / this.dotCount) * d + this.rotOffset + frameCount * 0.0008;
      let px = this.x + cos(angle) * this.radius;
      let py = this.y + sin(angle) * this.radius;
      let dotHue = lerpHue(this.hueVal, this.hue2, d / this.dotCount);
      fill(dotHue, 30, 100, this.life * 12);
      ellipse(px, py, 1.2);
    }
    for (let d = 0; d < this.dotCount / 2; d++) {
      let angle = (TWO_PI / (this.dotCount / 2)) * d + this.rotOffset * 1.5 + frameCount * -0.0006;
      let px = this.x + cos(angle) * this.radius * 1.2;
      let py = this.y + sin(angle) * this.radius * 1.2;
      fill(this.hue2, 25, 100, this.life * 6);
      ellipse(px, py, 0.8);
    }
  }

  isDead() { return this.life <= 0; }
}

// ===== CONNECTIONS =====
function drawConnections() {
  let active = creatures.filter(c => c.alpha > 10);
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      let ca = active[i], cb = active[j];
      let d = dist(ca.x, ca.y, cb.x, cb.y);
      if (d < 350) {
        let strength = map(d, 0, 350, 12, 0);
        let alphaM = strength * min(ca.alpha, cb.alpha) / 100;
        noStroke();
        let steps = Math.floor(d / 18);
        for (let s = 0; s <= steps; s++) {
          let t = s / steps;
          let offX = (noise(ca.x * 0.003 + s * 0.1, driftFieldTime) - 0.5) * 10;
          let offY = (noise(ca.y * 0.003 + s * 0.1, driftFieldTime + 50) - 0.5) * 10;
          let px = lerp(ca.x, cb.x, t) + offX * sin(t * PI);
          let py = lerp(ca.y, cb.y, t) + offY * sin(t * PI);
          let dotHue = lerpHue(ca.hueVal, cb.hueVal, t);
          fill(dotHue, 30, 100, alphaM * (0.3 + sin(t * PI) * 0.5));
          ellipse(px, py, 1);
        }
      }
    }
  }
}

// ===== STARS =====
function drawBgStars() {
  noStroke();
  for (let s of bgStars) {
    // Gentle twinkle — smooth sine-based, no jitter
    let twinkle = sin(frameCount * s.twinkleSpeed + s.phase) * 0.4 + 0.6;
    let a = s.baseAlpha * twinkle;
    fill(s.hueVal, s.sat, s.brightness, a);
    ellipse(s.x, s.y, s.size);
    // Soft glow on brighter stars
    if (s.size > 1.4) {
      fill(s.hueVal, s.sat * 0.5, s.brightness, a * 0.15);
      ellipse(s.x, s.y, s.size * 3);
    }
  }
}

// ===== SHOOTING STARS =====
function updateShootingStars() {
  // Rare — roughly every 15-40 seconds
  if (random() < 0.0007) {
    let dir = random() > 0.5 ? 1 : -1; // left or right
    shootingStars.push({
      x: dir > 0 ? random(width * 0.05, width * 0.5) : random(width * 0.5, width * 0.95),
      y: random(height * 0.03, height * 0.45),
      angle: random(PI * 0.05, PI * 0.4) * dir + (dir < 0 ? PI : 0),
      speed: random(4, 18),
      life: 1.0,
      decay: random(0.01, 0.035),
      len: random(30, 120),
      hueVal: random() < 0.7 ? 0 : random([200, 40, 180, 280]),
    });
  }

  noFill();
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    let ss = shootingStars[i];
    let dx = cos(ss.angle) * ss.speed;
    let dy = sin(ss.angle) * ss.speed;
    ss.x += dx;
    ss.y += dy;
    ss.life -= ss.decay;

    if (ss.life <= 0) { shootingStars.splice(i, 1); continue; }

    // Draw trail as fading line segments
    let tailX = ss.x - cos(ss.angle) * ss.len * ss.life;
    let tailY = ss.y - sin(ss.angle) * ss.len * ss.life;

    // Bright head
    strokeWeight(1.5);
    stroke(ss.hueVal, 5, 100, ss.life * 70);
    line(ss.x, ss.y, lerp(ss.x, tailX, 0.15), lerp(ss.y, tailY, 0.15));

    // Fading tail
    strokeWeight(0.8);
    stroke(ss.hueVal, 5, 100, ss.life * 30);
    line(lerp(ss.x, tailX, 0.15), lerp(ss.y, tailY, 0.15), tailX, tailY);

    // Soft glow at head
    noStroke();
    fill(ss.hueVal, 5, 100, ss.life * 20);
    ellipse(ss.x, ss.y, 4);
  }
}

// ===== HELPERS =====
function lerpHue(h1, h2, t) {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (h1 + diff * t + 360) % 360;
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
// Touch/click handled by DOM listeners in setup()

function keyPressed() {
  if (key === 'F') { toggleFullscreen(); return false; }
  if (awaitingClick && (key === ' ' || key === 'Enter')) {
    initAudio();
    awaitingClick = false;
    return false;
  }
  return false;
}

function doubleClicked() {
  toggleFullscreen();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  for (let s of bgStars) { s.x = random(width); s.y = random(height * 0.88); }
  generateTreeline();
}
