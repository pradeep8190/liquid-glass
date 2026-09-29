/**
 * Ultra-Fluid Tactile Ruler (2011 - 2020)
 * 
 * Features:
 * - Coupled Liquid Membrane Wave Physics (surface tension between adjacent ticks)
 * - Magnetic Fluid Snap-Glide (smooth drag freedom with buttery magnetic notches)
 * - Dual-Tone ASMR Mechanical Rotary Detents (high transient + warm mechanical body)
 * - Dynamic Needle Height morphing directly to the active tick line
 * - 100% Mirror Symmetry with locked upright 90° needle
 * - Year Label Ink Bloom & Elastic Scale
 */

(function () {
  const container = document.getElementById('rulerContainer');
  const canvas = document.getElementById('rulerCanvas');
  const ctx = canvas.getContext('2d');

  // Dual-Tone ASMR Mechanical Synthesizer
  let audioCtx = null;
  let lastClickTime = 0;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playMicroClick(speedRatio = 1, isMajor = false) {
    const nowMs = performance.now();
    const minInterval = Math.max(14, 28 - speedRatio * 14);
    if (nowMs - lastClickTime < minInterval) return;
    lastClickTime = nowMs;

    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;

      // 1. Crisp Metallic Transient (Top click)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      const highFreq = isMajor ? 2400 : 3100;
      osc1.frequency.setValueAtTime(highFreq + speedRatio * 300, now);
      osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.005);

      const highVol = Math.min(0.045, (isMajor ? 0.038 : 0.022) + speedRatio * 0.015);
      gain1.gain.setValueAtTime(highVol, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.005);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.005);

      // 2. Warm Mechanical Body (Satisfying low-mid detent thud)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      const lowFreq = isMajor ? 720 : 940;
      osc2.frequency.setValueAtTime(lowFreq, now);
      osc2.frequency.exponentialRampToValueAtTime(260, now + 0.008);

      const lowVol = Math.min(0.03, (isMajor ? 0.025 : 0.014) + speedRatio * 0.01);
      gain2.gain.setValueAtTime(lowVol, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 0.008);
    } catch (_) {}
  }

  // Component Configuration
  const CONFIG = {
    minYear: 2011,
    maxYear: 2020,
    initialValue: 2014,
    ticksPerYear: 8,        // 8 divisions per year
    tickSpacing: 6.5,       // Tight original line gap
    minTickHeight: 7.0,     // Resting height of edge ticks
    baseMaxTickHeight: 50,  // Base peak amplitude
    speedAmpBonus: 14,      // Dynamic swell with kinetic energy
    baseBellSpread: 38,     // Base wave spread
    speedSpreadBonus: 10,   // Dynamic spread expansion with speed
    needleWidth: 2.2,       // Crisp vertical needle width
    tickWidth: 1.15,
    labelSpread: 68,
    baselineOffset: 52,
    labelOffset: 21
  };

  const totalYears = CONFIG.maxYear - CONFIG.minYear;
  const totalTicks = totalYears * CONFIG.ticksPerYear;
  const step = 1 / CONFIG.ticksPerYear;

  // Membrane Wave Constants (Surface tension between adjacent ticks)
  const TICK_SPRING_K = 310;
  const TICK_SURFACE_TENSION = 160;
  const TICK_DAMPING = 22;

  // Pointer Motion Constants
  const POINTER_SNAP_SPRING = 360;
  const POINTER_DAMPING = 30;

  // State Management
  let currentValue = CONFIG.initialValue;
  let targetValue = CONFIG.initialValue;
  let pointerVelocity = 0;
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerTime = 0;
  let lastNotifiedTick = Math.round(CONFIG.initialValue / step);

  // Dynamic Amplitude & Wave State
  let currentMaxHeight = CONFIG.baseMaxTickHeight;
  let currentBellSpread = CONFIG.baseBellSpread;

  // Radial Ripples on interaction
  let ripples = [];

  // Coupled Dynamic Spring States for each tick
  const tickStates = [];
  for (let i = 0; i <= totalTicks; i++) {
    tickStates.push({
      height: CONFIG.minTickHeight,
      velocity: 0
    });
  }

  // Canvas Resizing with High-DPI support
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastFrameTime = performance.now();

  function resize() {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.resetTransform();
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize);
  resize();

  // Track Metrics
  function getTrackMetrics() {
    const trackWidth = totalTicks * CONFIG.tickSpacing;
    const startX = Math.max(16, (width - trackWidth) / 2);
    const endX = startX + trackWidth;
    return { startX, endX, trackWidth };
  }

  function valueToX(val) {
    const { startX, trackWidth } = getTrackMetrics();
    const progress = (val - CONFIG.minYear) / totalYears;
    return startX + progress * trackWidth;
  }

  function xToValue(x) {
    const { startX, trackWidth } = getTrackMetrics();
    const progress = (x - startX) / trackWidth;
    return CONFIG.minYear + progress * totalYears;
  }

  function getBellFactor(dist, sigma) {
    return Math.exp(-0.5 * Math.pow(dist / sigma, 2));
  }

  function createRipple(centerX) {
    ripples.push({
      x: centerX,
      radius: 0,
      speed: 480,
      maxRadius: 180,
      amplitude: 7,
      age: 0
    });
  }

  // Render Frame
  function render() {
    ctx.clearRect(0, 0, width, height);

    const baselineY = height - CONFIG.baselineOffset;

    // Active line index (locked for bilateral mirror symmetry)
    const activeTickIndex = Math.max(0, Math.min(totalTicks, Math.round((currentValue - CONFIG.minYear) / step)));
    const targetPointerX = valueToX(CONFIG.minYear + activeTickIndex * step);

    // 1. Draw Dense Dynamic Ticks with Coupled Wave Heights
    for (let i = 0; i <= totalTicks; i++) {
      const val = CONFIG.minYear + i * step;
      const x = valueToX(val);
      const tick = tickStates[i];
      const dist = Math.abs(x - targetPointerX);

      if (i === activeTickIndex) {
        // The active pointer line sits directly in its exact slot in the grid (Zero gap, 100% equal spacing)
        ctx.beginPath();
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
        ctx.moveTo(x, baselineY);
        ctx.lineTo(x, baselineY - tick.height);
        ctx.stroke();
      } else {
        const bell = getBellFactor(dist, currentBellSpread);
        const alpha = 0.16 + 0.58 * bell;

        ctx.beginPath();
        ctx.lineWidth = CONFIG.tickWidth;
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
        ctx.moveTo(x, baselineY);
        ctx.lineTo(x, baselineY - tick.height);
        ctx.stroke();
      }

      // 2. Draw Year Labels with Fluid Ink Bloom & Smooth Scaling
      if (i % CONFIG.ticksPerYear === 0) {
        const labelBell = getBellFactor(dist, CONFIG.labelSpread);
        const labelAlpha = 0.28 + 0.64 * labelBell;
        const isNearPointer = labelBell > 0.84;

        // Fluid non-linear scale pop
        const scale = 1 + 0.14 * Math.pow(labelBell, 2.2);
        const fontSize = 11.2 * scale;

        ctx.save();
        ctx.translate(x, baselineY + CONFIG.labelOffset);
        ctx.font = `${isNearPointer ? '600' : '500'} ${fontSize.toFixed(1)}px 'Inter', -apple-system, sans-serif`;
        ctx.fillStyle = isNearPointer ? '#000000' : `rgba(0, 0, 0, ${labelAlpha.toFixed(3)})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(val).toString(), 0, 0);
        ctx.restore();
      }
    }

    // Accessibility
    container.setAttribute('aria-valuenow', (Math.round(currentValue * 100) / 100).toFixed(2));
  }

  // Animation Loop with Coupled Liquid Membrane Physics
  function animate(now) {
    const dt = Math.min(24, Math.max(1, now - lastFrameTime)) / 1000;
    lastFrameTime = now;

    // 1. Pointer Motion & Inertia
    if (!isDragging) {
      // Rebound spring at 2011 and 2020 boundaries
      if (targetValue < CONFIG.minYear) {
        const pull = (CONFIG.minYear - targetValue) * 16;
        pointerVelocity += pull * dt;
        pointerVelocity *= Math.pow(0.82, dt * 60);
        targetValue += pointerVelocity * dt;
      } else if (targetValue > CONFIG.maxYear) {
        const pull = (CONFIG.maxYear - targetValue) * 16;
        pointerVelocity += pull * dt;
        pointerVelocity *= Math.pow(0.82, dt * 60);
        targetValue += pointerVelocity * dt;
      } else {
        // Friction decay
        pointerVelocity *= Math.pow(0.92, dt * 60);
        targetValue += pointerVelocity * dt;

        // Magnetic soft cushion into the nearest tick line
        if (Math.abs(pointerVelocity) < 0.3) {
          const nearest = Math.round(targetValue / step) * step;
          const snapForce = (nearest - targetValue) * POINTER_SNAP_SPRING;
          const dampingForce = -pointerVelocity * POINTER_DAMPING;
          pointerVelocity += (snapForce + dampingForce) * dt;
        }
      }
    }

    // Silky second-order fluid interpolation toward targetValue
    const catchupRate = isDragging ? 28 : 22;
    currentValue += (targetValue - currentValue) * (1 - Math.exp(-catchupRate * dt));

    // 2. Active Tick Index & Target Pointer X
    const activeTickIndex = Math.max(0, Math.min(totalTicks, Math.round((currentValue - CONFIG.minYear) / step)));
    const targetPointerX = valueToX(CONFIG.minYear + activeTickIndex * step);

    // 3. Dynamic Kinetic Amplitude Swell
    const speedRatio = Math.min(1.2, Math.abs(pointerVelocity) / 2.6);
    const targetMaxH = CONFIG.baseMaxTickHeight + speedRatio * CONFIG.speedAmpBonus;
    const targetSpread = CONFIG.baseBellSpread + speedRatio * CONFIG.speedSpreadBonus;
    currentMaxHeight += (targetMaxH - currentMaxHeight) * (1 - Math.exp(-12 * dt));
    currentBellSpread += (targetSpread - currentBellSpread) * (1 - Math.exp(-12 * dt));

    // 4. Update Harmonic Tap Ripples
    for (let r = ripples.length - 1; r >= 0; r--) {
      const rip = ripples[r];
      rip.radius += rip.speed * dt;
      rip.age += dt;
      if (rip.radius > rip.maxRadius) {
        ripples.splice(r, 1);
      }
    }

    // 5. Coupled Liquid Membrane Physics for Ticks (Surface Tension Wave)
    for (let i = 0; i <= totalTicks; i++) {
      const val = CONFIG.minYear + i * step;
      const x = valueToX(val);
      const tick = tickStates[i];
      const dist = Math.abs(x - targetPointerX);

      // Base Gaussian envelope
      const bell = getBellFactor(dist, currentBellSpread);
      let targetH = CONFIG.minTickHeight + (currentMaxHeight - CONFIG.minTickHeight) * bell;

      // Ripple influence
      for (let r = 0; r < ripples.length; r++) {
        const rip = ripples[r];
        const ripDist = Math.abs(x - rip.x);
        const waveFrontDist = Math.abs(ripDist - rip.radius);
        if (waveFrontDist < 24) {
          const wavePhase = (waveFrontDist / 24) * Math.PI;
          const waveDecay = 1 - (rip.radius / rip.maxRadius);
          targetH += Math.cos(wavePhase) * rip.amplitude * waveDecay;
        }
      }

      // Surface tension with adjacent neighbors (Coupled Wave Equation)
      const leftH = (i > 0) ? tickStates[i - 1].height : tick.height;
      const rightH = (i < totalTicks) ? tickStates[i + 1].height : tick.height;
      const surfaceCurvature = (leftH + rightH - 2 * tick.height);
      const surfaceTensionForce = surfaceCurvature * TICK_SURFACE_TENSION;

      // Restoring spring + damping
      const restoringForce = (targetH - tick.height) * TICK_SPRING_K;
      const dampingForce = -tick.velocity * TICK_DAMPING;

      tick.velocity += (restoringForce + surfaceTensionForce + dampingForce) * dt;
      tick.height += tick.velocity * dt;
    }

    // 6. Dynamic Acoustic Micro-Clicks modulated by speed
    const currentTickIndex = activeTickIndex;
    if (currentTickIndex !== lastNotifiedTick) {
      const isIntegerYear = (currentTickIndex % CONFIG.ticksPerYear) === 0;
      const speedRatio = Math.min(2.5, Math.abs(pointerVelocity) / 3.0);
      playMicroClick(speedRatio, isIntegerYear);

      if (navigator.vibrate && Math.abs(pointerVelocity) > 1.2) {
        navigator.vibrate(2);
      }
      lastNotifiedTick = currentTickIndex;
    }

    render();
    requestAnimationFrame(animate);
  }

  // Pointer Interaction: Fluid Continuous Drag with Magnetic Detents
  function updatePointer(clientX) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const rawVal = xToValue(x);

    // Subtle magnetic attraction towards tick notches while dragging smoothly
    const tickFraction = (rawVal - CONFIG.minYear) / step;
    const nearestTick = Math.round(tickFraction);
    const distanceToTick = tickFraction - nearestTick;

    // Non-linear magnetic detent: smooth in between, gentle pull near lines
    const magneticPull = Math.sin(distanceToTick * Math.PI) * 0.12;
    const refinedVal = (nearestTick + (distanceToTick - magneticPull)) * step + CONFIG.minYear;

    targetValue = Math.max(CONFIG.minYear - 0.15, Math.min(CONFIG.maxYear + 0.15, refinedVal));
  }

  container.addEventListener('pointerdown', (e) => {
    initAudio();
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerTime = performance.now();
    pointerVelocity = 0;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    createRipple(clickX);

    updatePointer(e.clientX);
    container.setPointerCapture(e.pointerId);
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const now = performance.now();
    const dx = e.clientX - lastPointerX;
    const dt = Math.max(1, now - lastPointerTime) / 1000;

    updatePointer(e.clientX);

    const { trackWidth } = getTrackMetrics();
    const deltaVal = (dx / trackWidth) * totalYears;
    const instantVel = deltaVal / dt;
    pointerVelocity = 0.55 * pointerVelocity + 0.45 * instantVel;

    lastPointerX = e.clientX;
    lastPointerTime = now;
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    try {
      if (e && e.pointerId) container.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Wheel interaction with momentum
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    initAudio();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    pointerVelocity += (delta * 0.008) * totalYears;
  }, { passive: false });

  // Keyboard navigation
  container.addEventListener('keydown', (e) => {
    initAudio();
    if (e.key === 'ArrowLeft') {
      targetValue = Math.max(CONFIG.minYear, targetValue - step);
      pointerVelocity = -1.8;
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      targetValue = Math.min(CONFIG.maxYear, targetValue + step);
      pointerVelocity = 1.8;
      e.preventDefault();
    }
  });

  // Start Animation Loop
  requestAnimationFrame(animate);
})();
