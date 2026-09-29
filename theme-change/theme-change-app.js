/**
 * Liquid Glass Theme Switch — WebGL Application Engine
 * Premium Liquid Glass Switch with Wave Meniscus Refraction
 * ZERO modifications to original files.
 */

// --- Physical & Geometric Configuration ---
const config = {
  // Pill track dimensions (matching reference image aspect ratio)
  trackWidth: 210,
  trackHeight: 70,
  trackRadius: 35,          // Semicircular pill ends

  // Upright rounded pebble liquid glass dome (towering above and below track)
  thumbHalfWidth: 57,       // Width = 114px
  thumbHalfHeight: 70,      // Height = 140px (double the track height)
  thumbRadius: 57,          // Smooth rounded pebble contour

  // Optical physical parameters
  ior: 1.22,                // Refraction Index
  dispersion: 0.00,         // Clean liquid glass
  lensHeight: 34.0,         // 3D dome height
  soundEnabled: true
};

// --- Application State ---
const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: Math.min(window.devicePixelRatio || 1, 2),

  // Mode: 0 = Light, 1 = Dark
  targetMode: 0,
  currentModeProgress: 0.0, // 0.0 -> 1.0

  // Track & Thumb coordinates
  trackX: window.innerWidth * 0.5,
  trackY: window.innerHeight * 0.5,
  thumbX: 0,
  thumbY: 0,
  targetThumbX: 0,
  velThumbX: 0,

  // Capillary ripple wave on click
  rippleTime: 999.0,
  rippleX: 0.0,
  rippleY: 0.0,

  // Render dirty check for 2D background texture
  bgDirty: true
};

// Synthesized audio click feedback
let audioCtx = null;
function playSoftClick(isDark) {
  if (!config.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    const freqStart = isDark ? 440 : 640;
    const freqEnd = isDark ? 280 : 880;

    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    // AudioContext blocked or unsupported
  }
}

// Compute travel limits for the thumb
function getTravelBounds() {
  const travelHalf = config.trackWidth * 0.5 - config.trackRadius; // 105 - 35 = 70px
  const leftX = state.trackX - travelHalf;
  const rightX = state.trackX + travelHalf;
  return { leftX, rightX, travelHalf };
}

// Set initial thumb position
function initPositions() {
  state.trackX = state.width * 0.5;
  state.trackY = state.height * 0.5;
  const { leftX, rightX } = getTravelBounds();
  state.thumbX = state.targetMode === 0 ? leftX : rightX;
  state.thumbY = state.trackY;
  state.targetThumbX = state.thumbX;
  state.currentModeProgress = state.targetMode;
  state.bgDirty = true;
}

// --- WebGL Setup ---
const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: false });

if (!gl) {
  alert('WebGL is required to render the Liquid Glass optics.');
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertexShader = compileShader(gl, gl.VERTEX_SHADER, toggleVsSource);
const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, toggleFsSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error('Program linking failed:', gl.getProgramInfoLog(program));
}
gl.useProgram(program);

// Quad buffer
const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1,
]), gl.STATIC_DRAW);

const aPosLoc = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(aPosLoc);
gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

// Shader Uniforms
const uResLoc = gl.getUniformLocation(program, 'u_resolution');
const uThumbPosLoc = gl.getUniformLocation(program, 'u_thumbPos');
const uThumbHalfLoc = gl.getUniformLocation(program, 'u_thumbHalfSize');
const uThumbRadLoc = gl.getUniformLocation(program, 'u_thumbRadius');
const uTimeLoc = gl.getUniformLocation(program, 'u_time');
const uRippleTimeLoc = gl.getUniformLocation(program, 'u_rippleTime');
const uRippleOrigLoc = gl.getUniformLocation(program, 'u_rippleOrigin');
const uIorLoc = gl.getUniformLocation(program, 'u_ior');
const uDispLoc = gl.getUniformLocation(program, 'u_dispersion');
const uLensHLoc = gl.getUniformLocation(program, 'u_lensHeight');
const uThemeProgLoc = gl.getUniformLocation(program, 'u_themeProgress');

// Background Texture
const bgTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, bgTexture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

// --- Offscreen 2D Dynamic Background Canvas ---
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d', { alpha: false });

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
    lerp(c1[3] !== undefined ? c1[3] : 1, c2[3] !== undefined ? c2[3] : 1, t)
  ];
}

function rgbaStr(arr) {
  return `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${arr[3]})`;
}

// Rounded rectangle path helper
function drawRoundedPill(ctx, x, y, width, height, radius) {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const r = Math.min(radius, hh, hw);

  ctx.beginPath();
  ctx.moveTo(x - hw + r, y - hh);
  ctx.lineTo(x + hw - r, y - hh);
  ctx.arc(x + hw - r, y - hh + r, r, -Math.PI * 0.5, 0);
  ctx.lineTo(x + hw, y + hh - r);
  ctx.arc(x + hw - r, y + hh - r, r, 0, Math.PI * 0.5);
  ctx.lineTo(x - hw + r, y + hh);
  ctx.arc(x - hw + r, y + hh - r, r, Math.PI * 0.5, Math.PI);
  ctx.lineTo(x - hw, y - hh + r);
  ctx.arc(x - hw + r, y - hh + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

// Draw radiant Sun icon
function drawSunIcon(ctx, x, y, opacity, scale = 1.0) {
  if (opacity <= 0.001) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = opacity;

  ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
  ctx.shadowBlur = 6;

  // Sun Core Disk
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
  ctx.fill();

  // 8 Radial Sun Rays
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const rayInner = 12.5;
  const rayOuter = 18.5;

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cosA * rayInner, sinA * rayInner);
    ctx.lineTo(cosA * rayOuter, sinA * rayOuter);
    ctx.stroke();
  }

  ctx.restore();
}

// Precision SVG Crescent Moon Path (Classic, authentic geometry matching reference image)
const moonSvgPath = new Path2D('M 9 0.79 A 9 9 0 1 1 -0.79 -9 A 7 7 0 0 0 9 0.79 Z');

// Draw luminous Moon Crescent icon
function drawMoonIcon(ctx, x, y, opacity, scale = 1.0) {
  if (opacity <= 0.001) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.24); // Aligns horns and curvature to match reference image
  ctx.scale(scale * 1.45, scale * 1.45);
  ctx.globalAlpha = opacity;

  // Luminous white outer aura glow
  ctx.shadowColor = 'rgba(255, 255, 255, 0.90)';
  ctx.shadowBlur = 10;

  // Crescent Moon Body
  ctx.fillStyle = '#ffffff';
  ctx.fill(moonSvgPath);

  // Second pass for intense brilliant white core
  ctx.shadowBlur = 4;
  ctx.fill(moonSvgPath);

  ctx.restore();
}

// Render dynamic 2D background scene
function drawBackground() {
  const w = state.width * state.dpr;
  const h = state.height * state.dpr;
  if (bgCanvas.width !== w || bgCanvas.height !== h) {
    bgCanvas.width = w;
    bgCanvas.height = h;
  }

  const ctx = bgCtx;
  ctx.save();
  ctx.scale(state.dpr, state.dpr);

  const sw = state.width;
  const sh = state.height;
  const prog = state.currentModeProgress; // 0.0 (Light) -> 1.0 (Dark)

  // 1. Ambient Studio Backdrop Gradient
  const bgCenterLight = [218, 222, 228];
  const bgMidLight = [198, 202, 210];
  const bgEdgeLight = [174, 178, 186];

  const bgCenterDark = [40, 42, 48];
  const bgMidDark = [28, 29, 34];
  const bgEdgeDark = [18, 19, 23];

  const cCenter = lerpColor(bgCenterLight, bgCenterDark, prog);
  const cMid = lerpColor(bgMidLight, bgMidDark, prog);
  const cEdge = lerpColor(bgEdgeLight, bgEdgeDark, prog);

  const bgGrad = ctx.createRadialGradient(state.trackX, state.trackY * 0.95, 60, state.trackX, state.trackY, sw * 0.75);
  bgGrad.addColorStop(0.0, rgbaStr(cCenter));
  bgGrad.addColorStop(0.45, rgbaStr(cMid));
  bgGrad.addColorStop(1.0, rgbaStr(cEdge));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, sw, sh);

  // 2. Subtle Studio Key Light
  const keyLightProg = ctx.createRadialGradient(state.trackX - 60, state.trackY - 140, 20, state.trackX, state.trackY, 420);
  const keyAlpha = lerp(0.16, 0.06, prog);
  keyLightProg.addColorStop(0, `rgba(255, 255, 255, ${keyAlpha})`);
  keyLightProg.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = keyLightProg;
  ctx.fillRect(0, 0, sw, sh);

  // 3. Toggle Track Geometry
  const tx = state.trackX;
  const ty = state.trackY;
  const tw = config.trackWidth;
  const th = config.trackHeight;
  const tr = config.trackRadius;

  // Multi-tier physical shadow establishing 3D elevation from the background plane
  ctx.save();
  ctx.filter = 'blur(18px)';
  drawRoundedPill(ctx, tx, ty + 8, tw, th, tr);
  ctx.fillStyle = `rgba(0, 0, 0, ${lerp(0.12, 0.44, prog)})`;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.filter = 'blur(7px)';
  drawRoundedPill(ctx, tx, ty + 4, tw, th, tr);
  ctx.fillStyle = `rgba(0, 0, 0, ${lerp(0.08, 0.28, prog)})`;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.filter = 'blur(2.5px)';
  drawRoundedPill(ctx, tx, ty + 2, tw, th, tr);
  ctx.fillStyle = `rgba(0, 0, 0, ${lerp(0.05, 0.20, prog)})`;
  ctx.fill();
  ctx.restore();

  // Track Base Fill: 3D form shading (top surface catches overhead light, bottom is shaded)
  ctx.save();
  drawRoundedPill(ctx, tx, ty, tw, th, tr);

  const trackGrad = ctx.createLinearGradient(tx, ty - th * 0.5, tx, ty + th * 0.5);
  const trackTopLight = [226, 230, 238];
  const trackBottomLight = [184, 188, 196];
  const trackTopDark = [40, 43, 50];        // Lighter than backdrop, providing true physical 3D height!
  const trackBottomDark = [16, 17, 21];

  trackGrad.addColorStop(0.0, rgbaStr(lerpColor(trackTopLight, trackTopDark, prog)));
  trackGrad.addColorStop(1.0, rgbaStr(lerpColor(trackBottomLight, trackBottomDark, prog)));
  ctx.fillStyle = trackGrad;
  ctx.fill();

  // Inset bottom shadow: physical recess falloff facing away from light
  const insetBottomGrad = ctx.createLinearGradient(tx, ty + th * 0.5 - 22, tx, ty + th * 0.5);
  insetBottomGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
  insetBottomGrad.addColorStop(1.0, `rgba(0, 0, 0, ${lerp(0.10, 0.30, prog)})`);
  ctx.fillStyle = insetBottomGrad;
  ctx.fill();
  ctx.restore();

  // Directional 3D Bevel Contour (Light catch on top, dark contact occlusion on bottom)
  ctx.save();
  drawRoundedPill(ctx, tx, ty, tw, th, tr);
  const bevelBorderGrad = ctx.createLinearGradient(tx, ty - th * 0.5, tx, ty + th * 0.5);
  const topBorderAlpha = lerp(0.30, 0.08, prog);
  const bottomBorderAlpha = lerp(0.08, 0.32, prog);

  bevelBorderGrad.addColorStop(0.0, `rgba(255, 255, 255, ${topBorderAlpha})`);
  bevelBorderGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.0)');
  bevelBorderGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.0)');
  bevelBorderGrad.addColorStop(1.0, `rgba(0, 0, 0, ${bottomBorderAlpha})`);

  ctx.lineWidth = 1.0;
  ctx.strokeStyle = bevelBorderGrad;
  ctx.stroke();
  ctx.restore();

  // Natural Overhead Light Reflection & Drop along Top 3D Bevel (Soft Sheen, Zero Harsh Line)
  const hwTrack = tw * 0.5;
  const hhTrack = th * 0.5;

  ctx.save();
  drawRoundedPill(ctx, tx, ty, tw, th, tr);
  ctx.clip(); // Confine all reflection & drop strictly inside the pill material

  // 1. Soft Vertical Light Drop Sheen washing down into the top face
  const dropAlpha = lerp(0.46, 0.11, prog);
  const topSheen = ctx.createLinearGradient(0, ty - hhTrack, 0, ty - hhTrack + 8.5);
  topSheen.addColorStop(0.0, `rgba(255, 255, 255, ${dropAlpha})`);
  topSheen.addColorStop(0.30, `rgba(255, 255, 255, ${dropAlpha * 0.40})`);
  topSheen.addColorStop(0.70, `rgba(255, 255, 255, ${dropAlpha * 0.10})`);
  topSheen.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = topSheen;
  ctx.fillRect(tx - hwTrack, ty - hhTrack, tw, 9);

  // 2. Feathered Specular Reflection on the curved crest (soft glint, naturally dissolves at corners)
  function traceTopPillArc() {
    ctx.beginPath();
    ctx.arc(tx - hwTrack + tr, ty - hhTrack + tr, tr, -Math.PI * 0.82, -Math.PI * 0.5);
    ctx.lineTo(tx + hwTrack - tr, ty - hhTrack);
    ctx.arc(tx + hwTrack - tr, ty - hhTrack + tr, tr, -Math.PI * 0.5, -Math.PI * 0.18);
  }

  const specGlintAlpha = lerp(0.28, 0.06, prog);
  const rimGrad = ctx.createLinearGradient(tx - hwTrack, 0, tx + hwTrack, 0);
  rimGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  rimGrad.addColorStop(0.20, `rgba(255, 255, 255, ${specGlintAlpha * 0.35})`);
  rimGrad.addColorStop(0.50, `rgba(255, 255, 255, ${specGlintAlpha})`);
  rimGrad.addColorStop(0.80, `rgba(255, 255, 255, ${specGlintAlpha * 0.35})`);
  rimGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.filter = 'blur(1.4px)';
  traceTopPillArc();
  ctx.lineWidth = 1.0;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rimGrad;
  ctx.stroke();
  ctx.restore();

  // 4. Icons & Typography Inside the Track
  const { leftX, rightX } = getTravelBounds();

  // Left Side: Sun Icon (Light Mode) or "Dark" Label (Dark Mode)
  const sunOpacity = Math.max(0, 1.0 - prog * 1.8);
  drawSunIcon(ctx, leftX, ty, sunOpacity, 1.0);

  // "Dark" text on the left side
  const darkTextOpacity = Math.max(0, (prog - 0.3) / 0.7);
  if (darkTextOpacity > 0.01) {
    ctx.save();
    ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(88, 92, 102, ${darkTextOpacity})`;
    ctx.fillText('Dark', tx - 48, ty + 1);
    ctx.restore();
  }

  // Right Side: "Light" Label (Light Mode) or Moon Icon (Dark Mode)
  const lightTextOpacity = Math.max(0, (0.7 - prog) / 0.7);
  if (lightTextOpacity > 0.01) {
    ctx.save();
    ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 255, 255, ${lightTextOpacity * 0.96})`;
    ctx.fillText('Light', tx + 48, ty + 1);
    ctx.restore();
  }

  // Moon crescent on the right side
  const moonOpacity = Math.max(0, (prog - 0.2) / 0.8);
  drawMoonIcon(ctx, rightX, ty, moonOpacity, 1.0);

  ctx.restore();

  // Upload to WebGL background texture
  gl.bindTexture(gl.TEXTURE_2D, bgTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
  state.bgDirty = false;
}

// --- Window Resize ---
function onResize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = state.width * state.dpr;
  canvas.height = state.height * state.dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);

  state.trackX = state.width * 0.5;
  state.trackY = state.height * 0.5;
  state.thumbY = state.trackY;

  const { leftX, rightX } = getTravelBounds();
  state.thumbX = lerp(leftX, rightX, state.currentModeProgress);
  state.targetThumbX = state.targetMode === 0 ? leftX : rightX;

  drawBackground();
}
window.addEventListener('resize', onResize);

// --- Pure Click Toggle Interaction ---
function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function triggerRipple(x, y) {
  state.rippleTime = 0.0;
  state.rippleX = x * state.dpr;
  state.rippleY = (state.height - y) * state.dpr;
}

function toggleMode(clickX, clickY) {
  state.targetMode = state.targetMode === 0 ? 1 : 0;
  const { leftX, rightX } = getTravelBounds();
  state.targetThumbX = state.targetMode === 0 ? leftX : rightX;

  if (clickX !== undefined && clickY !== undefined) {
    triggerRipple(clickX, clickY);
  } else {
    triggerRipple(state.thumbX, state.thumbY);
  }

  playSoftClick(state.targetMode === 1);
  updateUIThemeBadge();
}

function handleCanvasClick(e) {
  if (e.target.closest('.top-nav')) return;
  const pos = getPointerPos(e);
  toggleMode(pos.x, pos.y);
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchend', (e) => {
  if (e.target.closest('.top-nav')) return;
  const pos = getPointerPos(e.changedTouches ? e.changedTouches[0] : e);
  toggleMode(pos.x, pos.y);
}, { passive: true });

// --- UI Controls Binding ---
const themeBadge = document.getElementById('themeBadge');
const soundToggle = document.getElementById('soundToggle');

if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    config.soundEnabled = !config.soundEnabled;
    soundToggle.textContent = config.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
    soundToggle.classList.toggle('active', config.soundEnabled);
  });
}

function updateUIThemeBadge() {
  document.body.classList.toggle('dark-theme', state.targetMode === 1);
  if (themeBadge) {
    themeBadge.textContent = state.targetMode === 0 ? 'Light Mode' : 'Dark Mode';
  }
}

if (themeBadge) {
  themeBadge.addEventListener('click', () => toggleMode());
}

// --- 60/120 FPS Physics & WebGL Render Loop ---
let lastTime = performance.now();

function render(currentTime) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  // Snappy spring physics (~280ms)
  const { leftX, rightX } = getTravelBounds();
  const springStiffness = 140.0;
  const damping = 0.78;

  const forceX = (state.targetThumbX - state.thumbX) * springStiffness;
  state.velThumbX = (state.velThumbX + forceX * dt) * damping;
  state.thumbX += state.velThumbX * dt;

  // Snap directly to target once settled
  if (Math.abs(state.targetThumbX - state.thumbX) < 0.2 && Math.abs(state.velThumbX) < 0.5) {
    state.thumbX = state.targetThumbX;
    state.velThumbX = 0;
  }

  // Update theme progress (0.0 = Light at leftX, 1.0 = Dark at rightX)
  const prevProgress = state.currentModeProgress;
  const rawProgress = (state.thumbX - leftX) / (rightX - leftX);
  state.currentModeProgress = Math.max(0.0, Math.min(1.0, rawProgress));

  // Redraw 2D background texture if thumb moved or dirty
  if (Math.abs(state.currentModeProgress - prevProgress) > 0.002 || state.bgDirty) {
    drawBackground();
  }

  state.rippleTime += dt;

  // WebGL Uniforms
  gl.uniform2f(uResLoc, canvas.width, canvas.height);

  const glThumbX = state.thumbX * state.dpr;
  const glThumbY = (state.height - state.thumbY) * state.dpr;
  gl.uniform2f(uThumbPosLoc, glThumbX, glThumbY);

  // Droplet dimensions (114px x 140px)
  gl.uniform2f(uThumbHalfLoc, config.thumbHalfWidth * state.dpr, config.thumbHalfHeight * state.dpr);
  gl.uniform1f(uThumbRadLoc, config.thumbRadius * state.dpr);

  gl.uniform1f(uIorLoc, config.ior);
  gl.uniform1f(uDispLoc, config.dispersion);
  gl.uniform1f(uLensHLoc, config.lensHeight * state.dpr);
  gl.uniform1f(uThemeProgLoc, state.currentModeProgress);

  gl.uniform1f(uTimeLoc, currentTime * 0.001);
  gl.uniform1f(uRippleTimeLoc, state.rippleTime);
  gl.uniform2f(uRippleOrigLoc, state.rippleX, state.rippleY);

  // Render optics quad
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

// Initialize & Launch
initPositions();
onResize();
updateUIThemeBadge();
requestAnimationFrame(render);
