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

  // Drag interaction
  isDragging: false,
  dragStartX: 0,
  dragStartThumbX: 0,

  // Capillary ripple wave on tab switch
  rippleTime: 999.0,
  rippleX: 0.0,
  rippleY: 0.0,

  // Texture dirty flag
  bgDirty: true
};

// --- Synthesized Acoustic Feedback ---
let audioCtx = null;
function playLiquidPop(tabIndex) {
  if (!config.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

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

// Draw Profile Icon (Single person silhouette)
function drawProfileIcon(ctx, x, y, intensity) {
  ctx.save();
  ctx.translate(x, y);

  const colVal = Math.round(75 + 180 * intensity);
  const colorStr = `rgb(${colVal}, ${colVal}, ${colVal})`;

  if (intensity > 0.05) {
    ctx.shadowColor = `rgba(255, 255, 255, ${0.85 * intensity})`;
    ctx.shadowBlur = 14 * intensity;
  }

  ctx.fillStyle = colorStr;

  ctx.beginPath();
  ctx.arc(0, -6, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-11, 10);
  ctx.quadraticCurveTo(-11, 2, 0, 2);
  ctx.quadraticCurveTo(11, 2, 11, 10);
  ctx.closePath();
  ctx.fill();

  if (intensity > 0.6) {
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();
}

// Draw Settings Icon (Gear)
function drawSettingsIcon(ctx, x, y, intensity) {
  ctx.save();
  ctx.translate(x, y);

  const colVal = Math.round(75 + 180 * intensity);
  const colorStr = `rgb(${colVal}, ${colVal}, ${colVal})`;

  if (intensity > 0.05) {
    ctx.shadowColor = `rgba(255, 255, 255, ${0.85 * intensity})`;
    ctx.shadowBlur = 14 * intensity;
  }

  ctx.fillStyle = colorStr;

  ctx.beginPath();
  const numTeeth = 8;
  const outerR = 10.5;
  const innerR = 7.5;
  for (let i = 0; i < numTeeth * 2; i++) {
    const angle = (i * Math.PI) / numTeeth;
    const r = (i % 2 === 0) ? outerR : innerR;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.arc(0, 0, 4.0, 0, Math.PI * 2, true); // Cutout center hole
  ctx.fill();

  if (intensity > 0.6) {
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();
}

// Draw Home Icon (House silhouette with arched door cutout)
function drawHomeIcon(ctx, x, y, intensity) {
  ctx.save();
  ctx.translate(x, y);

  const colVal = Math.round(75 + 180 * intensity);
  const colorStr = `rgb(${colVal}, ${colVal}, ${colVal})`;

  if (intensity > 0.05) {
    ctx.shadowColor = `rgba(255, 255, 255, ${0.85 * intensity})`;
    ctx.shadowBlur = 14 * intensity;
  }

  ctx.fillStyle = colorStr;

  // Modern rounded house path
  ctx.beginPath();
  // Roof peak
  ctx.moveTo(0, -14);
  // Top right slope to eave
  ctx.lineTo(13, -2);
  ctx.arcTo(14, 0, 12, 2, 2.5);
  // Right wall down
  ctx.lineTo(12, 10);
  ctx.arcTo(12, 13, 9, 13, 3);
  // Bottom right
  ctx.lineTo(4, 13);
  // Arched door cutout
  ctx.lineTo(4, 3);
  ctx.arc(0, 3, 4, 0, Math.PI, true);
  ctx.lineTo(-4, 13);
  // Bottom left
  ctx.lineTo(-9, 13);
  ctx.arcTo(-12, 13, -12, 10, 3);
  // Left wall up
  ctx.lineTo(-12, 2);
  ctx.arcTo(-14, 0, -13, -2, 2.5);
  ctx.closePath();
  ctx.fill();

  if (intensity > 0.6) {
    // Second pass for intense radiant center
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.restore();
}

// Draw Analytics Icon (Rounded squircle badge with curved line chart & dot)
function drawAnalyticsIcon(ctx, x, y, intensity) {
  ctx.save();
  ctx.translate(x, y);

  const colVal = Math.round(75 + 180 * intensity);
  const colorStr = `rgb(${colVal}, ${colVal}, ${colVal})`;

  if (intensity > 0.05) {
    ctx.shadowColor = `rgba(255, 255, 255, ${0.85 * intensity})`;
    ctx.shadowBlur = 14 * intensity;
  }

  // Rounded badge container
  const bw = 32;
  const bh = 30;
  const br = 10;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.5 + br, -bh * 0.5);
  ctx.lineTo(bw * 0.5 - br, -bh * 0.5);
  ctx.arcTo(bw * 0.5, -bh * 0.5, bw * 0.5, -bh * 0.5 + br, br);
  ctx.lineTo(bw * 0.5, bh * 0.5 - br);
  ctx.arcTo(bw * 0.5, bh * 0.5, bw * 0.5 - br, bh * 0.5, br);
  ctx.lineTo(-bw * 0.5 + br, bh * 0.5);
  ctx.arcTo(-bw * 0.5, bh * 0.5, -bw * 0.5, bh * 0.5 - br, br);
  ctx.lineTo(-bw * 0.5, -bh * 0.5 + br);
  ctx.arcTo(-bw * 0.5, -bh * 0.5, -bw * 0.5 + br, -bh * 0.5, br);
  ctx.closePath();

  if (intensity > 0.4) {
    // When active: bright solid white badge with dark curve and dot
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Chart curve inside badge
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-9, 5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(1, 4);
    ctx.lineTo(7, -4);
    ctx.stroke();

    // Chart point / dot
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(8, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // When inactive: dark outline badge with dark curve and dot
    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, 5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(1, 4);
    ctx.lineTo(7, -4);
    ctx.stroke();

    ctx.fillStyle = colorStr;
    ctx.beginPath();
    ctx.arc(8, -8, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Draw Community / Users Icon (Dual person profile silhouettes)
function drawCommunityIcon(ctx, x, y, intensity) {
  ctx.save();
  ctx.translate(x, y);

  const colVal = Math.round(75 + 180 * intensity);
  const colorStr = `rgb(${colVal}, ${colVal}, ${colVal})`;

  if (intensity > 0.05) {
    ctx.shadowColor = `rgba(255, 255, 255, ${0.85 * intensity})`;
    ctx.shadowBlur = 14 * intensity;
  }

  ctx.fillStyle = colorStr;

  // Background person (offset slightly top-right)
  ctx.beginPath();
  ctx.arc(9, -7, 5.0, 0, Math.PI * 2); // Head
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(3, 4);
  ctx.quadraticCurveTo(10, 1, 16, 5);
  ctx.lineTo(16, 9);
  ctx.lineTo(6, 9);
  ctx.closePath();
  ctx.fill();

  // Foreground main person
  ctx.beginPath();
  ctx.arc(-4, -5, 6.5, 0, Math.PI * 2); // Head
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-14, 11);
  ctx.quadraticCurveTo(-14, 4, -4, 4);
  ctx.quadraticCurveTo(6, 4, 6, 11);
  ctx.closePath();
  ctx.fill();

  if (intensity > 0.6) {
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.restore();
}

// Draw the full scene to 2D background canvas
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

  // 1. Ambient Studio Grey Backdrop (Matching image.png & image copy.png)
  const bgGrad = ctx.createRadialGradient(state.trackX, state.trackY * 0.92, 80, state.trackX, state.trackY, sw * 0.75);
  bgGrad.addColorStop(0.0, '#e5e9f0');
  bgGrad.addColorStop(0.5, '#cfd5de');
  bgGrad.addColorStop(1.0, '#bfc6d0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, sw, sh);

  // 2. Subtle Precision Studio Grid (Visible in reference images)
  const gridSize = 48;
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.045)';
  ctx.beginPath();

  const startX = (state.trackX % gridSize);
  for (let x = startX; x < sw; x += gridSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, sh);
  }

  const startY = (state.trackY % gridSize);
  for (let y = startY; y < sh; y += gridSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(sw, y + 0.5);
  }
  ctx.stroke();

  // 3. Navigation Track Geometry (Sleek Pitch Black Pill)
  const tx = state.trackX;
  const ty = state.trackY;
  const tw = config.trackWidth;
  const th = config.trackHeight;
  const tr = config.trackRadius;

  // Elevation Drop Shadow
  ctx.save();
  ctx.filter = 'blur(20px)';
  drawRoundedPill(ctx, tx, ty + 10, tw, th, tr);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.filter = 'blur(7px)';
  drawRoundedPill(ctx, tx, ty + 4, tw, th, tr);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fill();
  ctx.restore();

  // Track Pill Body (Deep Obsidian Black)
  ctx.save();
  drawRoundedPill(ctx, tx, ty, tw, th, tr);
  const trackGrad = ctx.createLinearGradient(tx, ty - th * 0.5, tx, ty + th * 0.5);
  trackGrad.addColorStop(0.0, '#101114');
  trackGrad.addColorStop(0.4, '#08080a');
  trackGrad.addColorStop(1.0, '#020203');
  ctx.fillStyle = trackGrad;
  ctx.fill();

  // Subtle 3D Top Bevel Light Catch
  const hw = tw * 0.5;
  const hh = th * 0.5;
  ctx.clip();

  const topRim = ctx.createLinearGradient(tx - hw, 0, tx + hw, 0);
  topRim.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  topRim.addColorStop(0.2, 'rgba(255, 255, 255, 0.08)');
  topRim.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
  topRim.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)');
  topRim.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.lineWidth = 1.0;
  ctx.strokeStyle = topRim;
  ctx.beginPath();
  ctx.moveTo(tx - hw + tr, ty - hh + 0.5);
  ctx.lineTo(tx + hw - tr, ty - hh + 0.5);
  ctx.stroke();

  ctx.restore();

  // 4. Render Tabs (Inactive Pass)
  TABS.forEach((tab, index) => {
    const tabX = getTabPosition(index);
    const iconY = ty - 8;
    
    // Draw inactive icons (intensity 0.0) so they are visible everywhere
    if (index === 0) drawSettingsIcon(ctx, tabX, iconY, 0.0);
    else if (index === 1) drawHomeIcon(ctx, tabX, iconY, 0.0);
    else if (index === 2) drawAnalyticsIcon(ctx, tabX, iconY, 0.0);
    else if (index === 3) drawCommunityIcon(ctx, tabX, iconY, 0.0);
    else if (index === 4) drawProfileIcon(ctx, tabX, iconY, 0.0);
  });

  // 5. Render Active Tabs (Clipped to Lens)
  ctx.save();
  ctx.beginPath();
  drawRoundedPill(ctx, state.thumbX, state.thumbY, config.thumbHalfWidth * 2, config.thumbHalfHeight * 2, config.thumbRadius);
  ctx.clip();

  TABS.forEach((tab, index) => {
    const tabX = getTabPosition(index);
    const distToThumb = Math.abs(state.thumbX - tabX);

    // Intensity: 1.0 when bubble is centered over tab, 0.0 when far
    const rawInfluence = Math.max(0, 1.0 - distToThumb / 120.0);
    const intensity = rawInfluence * rawInfluence * (3.0 - 2.0 * rawInfluence);

    const iconY = ty - 8;
    const labelY = ty + 19;

    if (intensity > 0.01) {
      // Draw bright active icon
      if (index === 0) drawSettingsIcon(ctx, tabX, iconY, intensity);
      else if (index === 1) drawHomeIcon(ctx, tabX, iconY, intensity);
      else if (index === 2) drawAnalyticsIcon(ctx, tabX, iconY, intensity);
      else if (index === 3) drawCommunityIcon(ctx, tabX, iconY, intensity);
      else if (index === 4) drawProfileIcon(ctx, tabX, iconY, intensity);

      // Draw illuminated text label
      ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, intensity * 1.2)})`;
      ctx.shadowColor = `rgba(255, 255, 255, ${0.75 * intensity})`;
      ctx.shadowBlur = 8 * intensity;
      ctx.fillText(tab.label, tabX, labelY);
    }
  });

  ctx.restore();

  // Upload to WebGL background texture
  gl.bindTexture(gl.TEXTURE_2D, bgTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
  state.bgDirty = false;
}

// --- Resize Handling ---
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
  state.targetThumbX = getTabPosition(state.activeTabIndex);
  state.thumbX = state.targetThumbX;

  drawBackground();
}
window.addEventListener('resize', onResize);

// --- Pointer & Touch Interactions ---
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

function selectTab(index, clickX, clickY) {
  if (index < 0 || index >= TABS.length) return;
  state.activeTabIndex = index;
  state.targetThumbX = getTabPosition(index);

  if (clickX !== undefined && clickY !== undefined) {
    triggerRipple(clickX, clickY);
  } else {
    triggerRipple(state.targetThumbX, state.thumbY);
  }

  playLiquidPop(index);
  updateActiveViewUI();
}

function updateActiveViewUI() {
  const activeTab = TABS[state.activeTabIndex];
  const viewIndicator = document.getElementById('viewIndicator');
  if (viewIndicator) {
    const descriptions = {
      settings: 'App Configurations',
      home: 'Overview & Recent Activity',
      analytics: 'Live Performance Metrics',
      community: 'Active Members & Discussions',
      profile: 'User Account Details'
    };
    viewIndicator.innerHTML = `<span>Active: <strong>${activeTab.label}</strong></span> <span style="opacity:0.6;">•</span> <span style="font-weight:400;opacity:0.8;">${descriptions[activeTab.id]}</span>`;
  }
}

// Find closest tab index to a coordinate
function findClosestTab(x) {
  let closestIdx = 0;
  let minDist = Infinity;
  TABS.forEach((_, idx) => {
    const tabX = getTabPosition(idx);
    const dist = Math.abs(x - tabX);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = idx;
    }
  });
  return closestIdx;
}

// Drag & Click Handlers
function onPointerDown(e) {
  if (e.target.closest('.top-nav')) return;
  const pos = getPointerPos(e);

  // Check if click was on or near the track
  const trackDistY = Math.abs(pos.y - state.trackY);
  const trackDistX = Math.abs(pos.x - state.trackX);

  if (trackDistX <= config.trackWidth * 0.5 + 40 && trackDistY <= config.thumbHalfHeight + 20) {
    state.isDragging = true;
    state.dragStartX = pos.x;
    state.dragStartThumbX = state.thumbX;
  }
}

function onPointerMove(e) {
  if (!state.isDragging) return;
  const pos = getPointerPos(e);
  const deltaX = pos.x - state.dragStartX;

  const minX = getTabPosition(0) - 20;
  const maxX = getTabPosition(TABS.length - 1) + 20;
  state.targetThumbX = Math.max(minX, Math.min(maxX, state.dragStartThumbX + deltaX));
}

function onPointerUp(e) {
  if (!state.isDragging) return;
  state.isDragging = false;
  const pos = getPointerPos(e.changedTouches ? e.changedTouches[0] : e);

  // If dragged less than 6px, treat as a direct tab click
  const moved = Math.abs(pos.x - state.dragStartX);
  if (moved < 6) {
    const clickedTabIdx = findClosestTab(pos.x);
    selectTab(clickedTabIdx, pos.x, pos.y);
  } else {
    // Snap to the closest tab
    const closestIdx = findClosestTab(state.thumbX);
    selectTab(closestIdx, pos.x, pos.y);
  }
}

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

  // Snappy Organic Spring Physics (180 stiffness, 0.78 damping)
  const springStiffness = state.isDragging ? 260.0 : 175.0;
  const damping = state.isDragging ? 0.72 : 0.78;

  const forceX = (state.targetThumbX - state.thumbX) * springStiffness;
  state.velThumbX = (state.velThumbX + forceX * dt) * damping;
  state.thumbX += state.velThumbX * dt;

  // Snap directly when settled
  if (!state.isDragging && Math.abs(state.targetThumbX - state.thumbX) < 0.15 && Math.abs(state.velThumbX) < 0.4) {
    state.thumbX = state.targetThumbX;
    state.velThumbX = 0;
  }

  // Redraw 2D texture whenever thumb moves or dirty
  if (Math.abs(state.velThumbX) > 0.05 || state.bgDirty) {
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

  // Render Fullscreen Optics Quad
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

// Initialize & Launch
initPositions();
onResize();
updateActiveViewUI();
requestAnimationFrame(render);
