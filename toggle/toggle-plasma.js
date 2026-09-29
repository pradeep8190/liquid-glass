/**
 * Liquid Glass Plasma Ampoule Toggle — Fluid Kinematics & Interaction Engine
 * Manages spring physics, pointer drag momentum, and velocity tracking.
 */

window.createPlasmaToggleEngine = function (overlayEl, options = {}) {
  // State: true = ON (0.0, Solar Left), false = OFF (1.0, Emerald Right)
  let isON = options.initialState !== undefined ? options.initialState : true;
  let progress = isON ? 0.0 : 1.0;
  let targetProgress = progress;
  let velocity = 0.0;

  // Drag interaction state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartProgress = 0;
  let lastDragX = 0;
  let lastDragTime = 0;
  let dragVelocity = 0;

  const onStateChange = options.onStateChange || (() => {});

  function updateAria() {
    overlayEl.setAttribute('aria-checked', isON ? 'true' : 'false');
  }

  function setTargetState(newState) {
    isON = newState;
    targetProgress = isON ? 0.0 : 1.0;
    updateAria();
    onStateChange(isON);
  }

  function toggle() {
    setTargetState(!isON);
  }

  // Pointer & Drag Interactions
  function initEvents() {
    updateAria();

    const onPointerDown = (e) => {
      isDragging = true;
      dragStartX = e.clientX || (e.touches && e.touches[0].clientX);
      dragStartProgress = progress;
      lastDragX = dragStartX;
      lastDragTime = performance.now();
      dragVelocity = 0;

      try {
        overlayEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const currentX = e.clientX || (e.touches && e.touches[0].clientX);
      const now = performance.now();
      const dt = Math.max(1, now - lastDragTime);

      dragVelocity = (currentX - lastDragX) / dt;
      lastDragX = currentX;
      lastDragTime = now;

      // Map drag pixel delta to progress delta (capsule travel range ~160px)
      const rect = overlayEl.getBoundingClientRect();
      const travelRange = rect.width * 0.55;
      const deltaProgress = (currentX - dragStartX) / travelRange;

      progress = Math.max(0.0, Math.min(1.0, dragStartProgress + deltaProgress));
      velocity = dragVelocity * 0.15;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;

      try {
        overlayEl.releasePointerCapture(e.pointerId);
      } catch (_) {}

      // Click detection if barely moved
      const totalDx = Math.abs((e.clientX || lastDragX) - dragStartX);
      if (totalDx < 6) {
        toggle();
        return;
      }

      // Momentum toss: snap to target state based on projected progress
      const projectedProgress = progress + dragVelocity * 0.08;
      if (projectedProgress > 0.5) {
        setTargetState(false); // Snap to OFF (1.0)
      } else {
        setTargetState(true);  // Snap to ON (0.0)
      }
    };

    overlayEl.addEventListener('pointerdown', onPointerDown);
    overlayEl.addEventListener('pointermove', onPointerMove);
    overlayEl.addEventListener('pointerup', onPointerUp);
    overlayEl.addEventListener('pointercancel', onPointerUp);

    // Keyboard accessibility
    overlayEl.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });
  }

  // Spring Update Loop
  function update(dt) {
    if (!isDragging) {
      // Critically damped fluid spring physics
      const springK = 260.0;
      const springDamping = 22.0;
      const springForce = -springK * (progress - targetProgress) - springDamping * velocity;
      velocity += springForce * dt;
      progress += velocity * dt;
    }
  }

  initEvents();

  return {
    update,
    toggle,
    setState: setTargetState,
    isON: () => isON,
    getProgress: () => Math.max(0.0, Math.min(1.0, progress)),
    getVelocity: () => velocity,
  };
};
