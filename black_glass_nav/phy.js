/**
 * Liquid Glass Navigation Bar — Physics & Interaction Engine
 * Handles pointer events, magnetic gravity wells, momentum velocity, and UI state logic.
 */

// Helper: Convert pointer/touch events to canvas-relative coordinates
function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

// Trigger capillary ripple optical wave at (x, y)
function triggerRipple(x, y) {
  state.rippleTime = 0.0;
  state.rippleX = x * state.dpr;
  state.rippleY = (state.height - y) * state.dpr;
}

// Target tab selection with optional click coordinates for ripple origin
function selectTab(index, clickX, clickY) {
  if (index < 0 || index >= TABS.length) return;
  const target = getTabPosition(index);
  
  // Set explicit target for physics engine to bypass magnetic wells and snap directly
  state.explicitTarget = target;

  if (clickX !== undefined && clickY !== undefined) {
    triggerRipple(clickX, clickY);
  } else {
    triggerRipple(target, state.thumbY);
  }
}

// Update Active View Text Indicator in UI
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

// Window Resize Handler
function onResize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (canvas && gl) {
    canvas.width = state.width * state.dpr;
    canvas.height = state.height * state.dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  state.trackX = state.width * 0.5;
  state.trackY = state.height * 0.5;
  state.thumbY = state.trackY;
  state.targetThumbX = getTabPosition(state.activeTabIndex);

  if (!state.isDragging && state.explicitTarget === null) {
    state.thumbX = state.targetThumbX;
  }

  if (typeof drawBackground === 'function') {
    drawBackground();
  }
}

// Drag & Pointer Handlers
function onPointerDown(e) {
  if (e.target.closest('.top-nav')) return;
  const pos = getPointerPos(e);

  // Check if click was on or near the track
  const trackDistY = Math.abs(pos.y - state.trackY);
  const trackDistX = Math.abs(pos.x - state.trackX);

  if (trackDistX <= config.trackWidth * 0.5 + 40 && trackDistY <= config.thumbHalfHeight + 20) {
    state.isDragging = true;
    state.explicitTarget = null; // Resume physical momentum drag
    state.dragStartX = pos.x;
    state.dragStartThumbX = state.thumbX;
    state.lastPointerX = pos.x;
    state.lastPointerTime = performance.now();
    state.velThumbX = 0;
  }
}

function onPointerMove(e) {
  if (!state.isDragging) return;
  const pos = getPointerPos(e);
  
  // Calculate instantaneous velocity for physical drag mass
  const now = performance.now();
  const dt = Math.max(1, now - state.lastPointerTime) / 1000;
  const instantVel = (pos.x - state.lastPointerX) / dt;
  
  // Exponential Moving Average to smooth out raw polling jitter from high-Hz mice
  state.velThumbX = state.velThumbX * 0.6 + instantVel * 0.4;
  
  state.lastPointerX = pos.x;
  state.lastPointerTime = now;

  const stretchOffset = config.thumbHalfWidth * Math.max(0, state.scaleX - 1.0);
  const minX = getTabPosition(0) + stretchOffset;
  const maxX = getTabPosition(TABS.length - 1) - stretchOffset;
  state.thumbX = Math.max(minX, Math.min(maxX, pos.x)); // Finger dictates position
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
  }
}
