/**
 * Liquid Glass Navigation Bar — WebGL Application Engine
 * Interactive 3-Tab Floating Glass Navigation Bar faithfully matching reference images:
 * - Tab 0: Home
 * - Tab 1: Analytics (Default active state matching image.png)
 * - Tab 2: Community / Users
 *
 * Real-time Snell's Law GPU Refraction, Snappy Spring Physics, Drag & Snap, Web Audio
 */

// --- Physical & Geometric Configuration ---
const config = {
  // Navigation Track Pill Dimensions
  trackWidth: 704, // Expanded to accommodate 5 tabs
  trackHeight: 88,
  trackRadius: 44, // Semicircular ends

  // Liquid Glass Bubble Dimensions (rounded squircle tending toward square with curved borders)
  thumbHalfWidth: 67,  // Total width: 134px
  thumbHalfHeight: 63, // Total height: 126px
  thumbRadius: 44,     // Squircle curve radius giving rounded square silhouette

  // Optical physical parameters
  ior: 1.25,           // Refraction index (water/clean liquid glass)
  dispersion: 0.006,   // Subtle chromatic dispersion at edges
  lensHeight: 34.0,    // 3D dome height
  soundEnabled: true
};

// --- Tab Definitions ---
const TABS = [
  { id: 'settings', label: 'Settings', offset: -264 },
  { id: 'home', label: 'Home', offset: -132 },
  { id: 'analytics', label: 'Analytics', offset: 0 },
  { id: 'community', label: 'Community', offset: 132 },
  { id: 'profile', label: 'Profile', offset: 264 }
];

// --- Application State ---
const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: Math.min(window.devicePixelRatio || 1, 2),

  activeTabIndex: 2, // Default active: Analytics (matches index 2 now)

  // Track & Thumb coordinates
  trackX: window.innerWidth * 0.5,
  trackY: window.innerHeight * 0.5,

  thumbX: 0,
  thumbY: 0,
  targetThumbX: 0,
  velThumbX: 0,
  scaleX: 1.0,
  scaleY: 1.0,
  scaleVelX: 0,
  explicitTarget: null, // Used for direct click navigation

  // Drag interaction
  isDragging: false,
  dragStartX: 0,
  dragStartThumbX: 0,
  lastPointerX: 0,
  lastPointerTime: 0,

  // Capillary ripple wave on tab switch
  rippleTime: 999.0,
  rippleX: 0.0,
  rippleY: 0.0,

  // Texture dirty flag
  bgDirty: true
};

// --- Synthesized Acoustic Feedback ---
let audioCtx = null;

// Modern browsers block audio until the user interacts.
// This function instantly unlocks the audio hardware on the very first click/touch.
function unlockAudio() {
  if (!config.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Play a 1ms silent tone to force the OS audio hardware to wake up instantly (fixes iOS/Chrome delays)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.001);

    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  } catch (e) {}
}

window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('touchstart', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio, { passive: true });

function playLiquidPop(tabIndex) {
  if (!config.soundEnabled) return;
  try {
    if (!audioCtx) unlockAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    const baseFreqs = [400, 500, 630, 780, 950];
    const freq = baseFreqs[tabIndex] || 600;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.3, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    // AudioContext blocked or unsupported
  }
}

// Compute tab centers in screen CSS pixels
function getTabPosition(index) {
  return state.trackX + TABS[index].offset;
}

function initPositions() {
  state.trackX = state.width * 0.5;
  state.trackY = state.height * 0.5;
  state.thumbX = getTabPosition(state.activeTabIndex);
  state.thumbY = state.trackY;
  state.targetThumbX = state.thumbX;
  state.bgDirty = true;
}

// --- WebGL Setup ---
const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: false });

if (!gl) {
  alert('WebGL is required for liquid glass optical refraction.');
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertexShader = compileShader(gl, gl.VERTEX_SHADER, navVsSource);
const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, navFsSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error('Program link failed:', gl.getProgramInfoLog(program));
}
gl.useProgram(program);

// Screen Quad Buffer
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

// Uniform Locations
const uResLoc = gl.getUniformLocation(program, 'u_resolution');
const uThumbPosLoc = gl.getUniformLocation(program, 'u_thumbPos');
const uThumbHalfLoc = gl.getUniformLocation(program, 'u_thumbHalfSize');
const uThumbRadLoc = gl.getUniformLocation(program, 'u_thumbRadius');
const uTimeLoc = gl.getUniformLocation(program, 'u_time');
const uRippleTimeLoc = gl.getUniformLocation(program, 'u_rippleTime');
const uRippleOrigLoc = gl.getUniformLocation(program, 'u_rippleOrigin');
const uScaleLoc = gl.getUniformLocation(program, 'u_scale');
const uIorLoc = gl.getUniformLocation(program, 'u_ior');
const uDispLoc = gl.getUniformLocation(program, 'u_dispersion');
const uLensHLoc = gl.getUniformLocation(program, 'u_lensHeight');

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

// Event Listeners (Pointer, Touch, Window Resize)
window.addEventListener('resize', onResize);

canvas.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

canvas.addEventListener('touchstart', onPointerDown, { passive: true });
window.addEventListener('touchmove', onPointerMove, { passive: true });
window.addEventListener('touchend', onPointerUp, { passive: true });

// Keyboard Navigation (Arrow keys and 1, 2, 3)
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    selectTab((state.activeTabIndex + 1) % TABS.length);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    selectTab((state.activeTabIndex - 1 + TABS.length) % TABS.length);
  } else if (e.key === '1') selectTab(0);
  else if (e.key === '2') selectTab(1);
  else if (e.key === '3') selectTab(2);
  else if (e.key === '4') selectTab(3);
  else if (e.key === '5') selectTab(4);
});

// UI Sound Toggle
const soundToggle = document.getElementById('soundToggle');
if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    config.soundEnabled = !config.soundEnabled;
    soundToggle.textContent = config.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
    soundToggle.classList.toggle('active', config.soundEnabled);
  });
}

// --- 60/120 FPS Physics & WebGL Render Loop ---
let lastTime = performance.now();

function render(currentTime) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  // 1. Momentum & Magnetic Gravity Wells Simulation
  if (state.explicitTarget !== null) {
    // Explicit click animation directly to target (bypassing gravity wells)
    const dist = state.explicitTarget - state.thumbX;
    const forceX = dist * 280.0;
    state.velThumbX = (state.velThumbX + forceX * dt) * 0.72;
    state.thumbX += state.velThumbX * dt;

    if (Math.abs(dist) < 0.5 && Math.abs(state.velThumbX) < 1.0) {
      state.thumbX = state.explicitTarget;
      state.velThumbX = 0;
      state.explicitTarget = null;
      
      const closestIdx = findClosestTab(state.thumbX);
      if (state.activeTabIndex !== closestIdx) {
        state.activeTabIndex = closestIdx;
        playLiquidPop(closestIdx);
        updateActiveViewUI();
      }
    }
  } else if (!state.isDragging) {
    let friction = 0.95; // Base gliding friction
    const closestIdx = findClosestTab(state.thumbX);
    const tabX = getTabPosition(closestIdx);
    const dist = tabX - state.thumbX;

    let spring = 0;
    if (Math.abs(dist) < 66) {
      // Deeper in the magnetic well = stronger pull, higher friction (snapping)
      const wellDepth = 1.0 - (Math.abs(dist) / 66.0);
      spring = dist * (250.0 + wellDepth * 400.0);
      friction = 0.94 - (wellDepth * 0.18); // Dynamically drops from 0.94 to 0.76 to halt organically
    }
    
    state.velThumbX += spring * dt;
    state.velThumbX *= friction;
    state.thumbX += state.velThumbX * dt;

    // Hard track bounds bounce (Dynamic constraint based on jelly stretch to prevent spilling out)
    const stretchOffset = config.thumbHalfWidth * Math.max(0, state.scaleX - 1.0);
    const minX = getTabPosition(0) + stretchOffset;
    const maxX = getTabPosition(TABS.length - 1) - stretchOffset;
    if (state.thumbX < minX) { state.thumbX = minX; state.velThumbX *= -0.6; }
    if (state.thumbX > maxX) { state.thumbX = maxX; state.velThumbX *= -0.6; }

    // Active state dispatch & Audio Snap
    if (Math.abs(dist) < 1.0 && Math.abs(state.velThumbX) < 10.0) {
       state.thumbX = tabX;
       state.velThumbX = 0;
       if (state.activeTabIndex !== closestIdx) {
          state.activeTabIndex = closestIdx;
          playLiquidPop(closestIdx);
          updateActiveViewUI();
       }
    }
  }

  // 2. Mass Conservation Jelly Physics (Squash and Stretch)
  const speed = Math.abs(state.velThumbX);
  const targetScaleX = 1.0 + (speed * 0.00035); // Fast = Wider
  const scaleForce = (targetScaleX - state.scaleX) * 450.0;
  state.scaleVelX = (state.scaleVelX + scaleForce * dt) * 0.75; // Organic wobble
  state.scaleX += state.scaleVelX * dt;
  state.scaleX = Math.max(0.6, Math.min(1.6, state.scaleX));
  state.scaleY = 1.0 / state.scaleX; // Conservation of mass: Area = W * H = Constant

  // Redraw 2D texture whenever thumb moves or distorts
  if (Math.abs(state.velThumbX) > 0.05 || Math.abs(state.scaleVelX) > 0.01 || state.bgDirty) {
    drawBackground();
  }

  state.rippleTime += dt;

  // WebGL Uniforms
  gl.uniform2f(uResLoc, canvas.width, canvas.height);

  const glThumbX = state.thumbX * state.dpr;
  const glThumbY = (state.height - state.thumbY) * state.dpr;
  gl.uniform2f(uThumbPosLoc, glThumbX, glThumbY);

  gl.uniform2f(uThumbHalfLoc, config.thumbHalfWidth * state.dpr, config.thumbHalfHeight * state.dpr);
  gl.uniform1f(uThumbRadLoc, config.thumbRadius * state.dpr);

  gl.uniform1f(uIorLoc, config.ior);
  gl.uniform1f(uDispLoc, config.dispersion);
  gl.uniform1f(uLensHLoc, config.lensHeight * state.dpr);

  gl.uniform1f(uTimeLoc, currentTime * 0.001);
  gl.uniform1f(uRippleTimeLoc, state.rippleTime);
  gl.uniform2f(uRippleOrigLoc, state.rippleX, state.rippleY);
  gl.uniform2f(uScaleLoc, state.scaleX, state.scaleY);

  // Render Fullscreen Optics Quad
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

// Initialize & Launch
initPositions();
onResize();
updateActiveViewUI();
requestAnimationFrame(render);
