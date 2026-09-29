/**
 * Liquid Glass Button — Core Physics & WebGL Optics Engine
 * Zero Dead Code — Clean Modular Architecture Ready for Scaling
 */

(function () {
  'use strict';

  // DOM Elements
  const stage = document.getElementById('stageContainer');
  const glCanvas = document.getElementById('glcanvas');
  const bgCanvas = document.getElementById('bgCanvas');
  const touchOverlay = document.getElementById('touchOverlay');
  const cardActionsMenu = document.getElementById('cardActionsMenu');

  // Device Pixel Ratio
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Optical Constants
  const OPTICAL_IOR = 1.54;
  const OPTICAL_DISPERSION = 0.055;
  const BASE_LENS_HEIGHT = 15.0;
  const BUTTON_RADIUS_CSS = 36.0;

  // Position State (Fixed in left-bottom corner)
  let buttonX = 0;
  let buttonY = 0;

  // Tactile Press Spring Physics
  let pressScale = 1.0;
  let targetPressScale = 1.0;
  let pressVelocity = 0.0;
  let lastFrameTime = performance.now();

  // Apple Liquid Glass Hydraulic & Metaball Physics
  let expandY = 0.0;
  let expandVelY = 0.0;
  let expandX = 0.0;
  let expandVelX = 0.0;
  let targetExpand = 0.0;
  let neckPinch = 0.0;

  // WebGL Pipeline
  let gl, program;
  let bgTexture;
  let uniforms = {};
  let bgCtx;

  // Initialize WebGL
  function initWebGL() {
    gl = glCanvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.error('WebGL not supported');
      return false;
    }

    const vs = compileShader(gl.VERTEX_SHADER, buttonVsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, buttonFsSource);

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    gl.useProgram(program);

    // Fullscreen Quad Geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Cache Uniform Locations
    const uniformNames = [
      'u_background',
      'u_resolution',
      'u_buttonPos',
      'u_buttonRadius',
      'u_pressScale',
      'u_ior',
      'u_dispersion',
      'u_lensHeight',
      'u_expandProgress',
      'u_expandProgressX',
    ];

    uniformNames.forEach((name) => {
      uniforms[name] = gl.getUniformLocation(program, name);
    });

    // Create 2D Background Texture
    bgTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    bgCtx = bgCanvas.getContext('2d', { alpha: false });

    return true;
  }

  function compileShader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  /**
   * Render High-Precision 2D Background:
   * - Studio card surface with subtle ambient lighting
   * - Subtle engineering grid lines (soft whiteness-grey)
   */
  function renderBackground() {
    const w = bgCanvas.width;
    const h = bgCanvas.height;

    // Card surface fill
    bgCtx.fillStyle = '#edf0f5';
    bgCtx.fillRect(0, 0, w, h);

    // Faint subtle gradient lighting across the card surface
    const surfaceGrad = bgCtx.createRadialGradient(
      w * 0.35, h * 0.35, 20 * dpr,
      w * 0.5, h * 0.5, w * 0.7
    );
    surfaceGrad.addColorStop(0, '#f2f5fa');
    surfaceGrad.addColorStop(1, '#e8ebf0');
    bgCtx.fillStyle = surfaceGrad;
    bgCtx.fillRect(0, 0, w, h);

    // 1. Subtle Engineering Grid Lines (Soft whiteness-grey, no harsh dark grey)
    const gridSize = 76 * dpr;
    const gridOffsetX = (w % gridSize) * 0.5;
    const gridOffsetY = (h % gridSize) * 0.5;

    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.50)';
    bgCtx.lineWidth = 1.0 * dpr;
    bgCtx.beginPath();

    for (let x = gridOffsetX; x <= w; x += gridSize) {
      bgCtx.moveTo(Math.round(x) + 0.5, 0);
      bgCtx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = gridOffsetY; y <= h; y += gridSize) {
      bgCtx.moveTo(0, Math.round(y) + 0.5);
      bgCtx.lineTo(w, Math.round(y) + 0.5);
    }
    bgCtx.stroke();

    // Upload to WebGL texture
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
  }

  // Handle Resize & Set Bottom-Left Corner Position
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stage.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    glCanvas.width = width * dpr;
    glCanvas.height = height * dpr;
    bgCanvas.width = width * dpr;
    bgCanvas.height = height * dpr;

    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    // True Left-Bottom Corner Position
    const CORNER_INSET_LEFT = 75.0;
    const CORNER_INSET_BOTTOM = 75.0;

    buttonX = CORNER_INSET_LEFT;
    buttonY = height - CORNER_INSET_BOTTOM;

    renderBackground();
  }

  // Tactile Button & Expanded Glass Interaction
  function initInteractions() {
    let pointerDownOnButton = false;

    touchOverlay.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const distToBtn = Math.hypot(mouseX - buttonX, mouseY - buttonY);

      if (distToBtn <= BUTTON_RADIUS_CSS) {
        touchOverlay.classList.add('hovering-button');
      } else if (targetExpand > 0.5) {
        const inCardX = mouseX >= buttonX - 36 && mouseX <= buttonX + 160;
        const inCardY = mouseY >= buttonY - 240 && mouseY <= buttonY + 36;
        if (inCardX && inCardY) {
          touchOverlay.classList.add('hovering-button');
        } else {
          touchOverlay.classList.remove('hovering-button');
        }
      } else {
        touchOverlay.classList.remove('hovering-button');
      }
    });

    touchOverlay.addEventListener('pointerdown', (e) => {
      const rect = stage.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const dist = Math.hypot(clickX - buttonX, clickY - buttonY);

      if (dist <= BUTTON_RADIUS_CSS) {
        targetPressScale = 0.93;
        pointerDownOnButton = true;
        touchOverlay.setPointerCapture(e.pointerId);
      } else if (targetExpand > 0.5) {
        // Click outside closes smoothly with fluid drain
        targetExpand = 0.0;
        updateActionsMenu();
      }
    });

    const hoverGlider = document.getElementById('hoverGlider');

    function updateActionsMenu() {
      if (!cardActionsMenu) return;
      if (targetExpand > 0.5) {
        cardActionsMenu.classList.add('open');
        cardActionsMenu.setAttribute('aria-hidden', 'false');
      } else {
        cardActionsMenu.classList.remove('open');
        cardActionsMenu.setAttribute('aria-hidden', 'true');
        if (hoverGlider) {
          hoverGlider.classList.remove('active');
        }
      }
    }

    // Continuous Fluid Gliding Hover Track & Tactile Feedback
    if (cardActionsMenu && hoverGlider) {
      const actionBtns = cardActionsMenu.querySelectorAll('.card-action-btn');

      actionBtns.forEach((btn) => {
        btn.addEventListener('pointerenter', () => {
          hoverGlider.style.top = btn.offsetTop + 'px';
          hoverGlider.style.left = btn.offsetLeft + 'px';
          hoverGlider.style.width = btn.offsetWidth + 'px';
          hoverGlider.style.height = btn.offsetHeight + 'px';
          hoverGlider.classList.add('active');
        });

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          btn.classList.add('clicked');
          setTimeout(() => btn.classList.remove('clicked'), 160);
        });
      });

      cardActionsMenu.addEventListener('pointerleave', () => {
        hoverGlider.classList.remove('active');
      });
    }

    // Dedicated X (Cross) Close Button Handler
    const cardCloseAnchor = document.getElementById('cardCloseAnchor');
    if (cardCloseAnchor) {
      cardCloseAnchor.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        targetPressScale = 0.93;
      });

      cardCloseAnchor.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        targetPressScale = 1.0;
        targetExpand = 0.0;
        updateActionsMenu();
      });

      cardCloseAnchor.addEventListener('click', (e) => {
        e.stopPropagation();
        targetPressScale = 1.0;
        targetExpand = 0.0;
        updateActionsMenu();
      });
    }

    const release = (e) => {
      if (pointerDownOnButton) {
        pointerDownOnButton = false;
        targetPressScale = 1.0;

        const rect = stage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const dist = Math.hypot(clickX - buttonX, clickY - buttonY);

        if (dist <= BUTTON_RADIUS_CSS) {
          targetExpand = targetExpand > 0.5 ? 0.0 : 1.0;
          updateActionsMenu();
        }

        try {
          touchOverlay.releasePointerCapture(e.pointerId);
        } catch (_) { }
      }
    };

    touchOverlay.addEventListener('pointerup', release);
    touchOverlay.addEventListener('pointercancel', release);
    touchOverlay.addEventListener('pointerleave', release);
  }

  // Real Apple Liquid Glass Physics Frame Loop
  function render(time) {
    const dt = Math.min((time - lastFrameTime) / 1000, 0.04);
    lastFrameTime = time;

    // 1. Tactile press spring physics
    const springK = 320.0;
    const damping = 22.0;
    const pressForce = (targetPressScale - pressScale) * springK;
    pressVelocity += (pressForce - pressVelocity * damping) * dt;
    pressScale += pressVelocity * dt;

    // 2. Vertical Fluid Column Surge (Underdamped Harmonic Oscillator)
    // Shoots upward fast with molten fluid momentum, overshoots to ~1.14, settles gracefully
    const kY = 195.0;
    const dY = 13.5; // Underdamped damping ratio ~0.38 -> natural fluid bounce
    const forceY = (targetExpand - expandY) * kY;
    expandVelY += (forceY - expandVelY * dY) * dt;
    expandY += expandVelY * dt;

    // 3. Lateral Fluid Spread (Viscous Hydraulic Lag)
    // Width spreads after height reaches momentum, then pushes outward with hydraulic pressure
    const kX = 145.0;
    const dX = 14.5;
    const targetX = targetExpand > 0.5 ? Math.min(1.0, expandY * 1.15) : targetExpand;
    const forceX = (targetX - expandX) * kX;
    expandVelX += (forceX - expandVelX * dX) * dt;
    expandX += expandVelX * dt;

    // Clean zero lock at rest
    if (targetExpand === 0.0 && Math.abs(expandY) < 0.002 && Math.abs(expandVelY) < 0.02 && Math.abs(expandX) < 0.002 && Math.abs(expandVelX) < 0.02) {
      expandY = 0.0;
      expandVelY = 0.0;
      expandX = 0.0;
      expandVelX = 0.0;
      neckPinch = 0.0;
    }

    // 4. Dynamic Hydraulic Neck Pinch: peak tension during the rapid upward stretch
    if (targetExpand > 0.5 && expandVelY > 0.05) {
      // Pinches the molten bridge proportionally to pull velocity
      const desiredPinch = Math.min(1.0, expandVelY * 0.28 * (1.0 - Math.min(1.0, expandX * 0.85)));
      neckPinch += (desiredPinch - neckPinch) * Math.min(1.0, dt * 18.0);
    } else {
      neckPinch = Math.max(0.0, neckPinch - dt * 6.0);
    }

    // Pass Uniforms to Fragment Shader
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(uniforms.u_background, 0);

    gl.uniform2f(uniforms.u_resolution, glCanvas.width, glCanvas.height);

    // Convert CSS button position to WebGL pixel coordinates (WebGL Y is flipped)
    const buttonPxX = buttonX * dpr;
    const buttonPxY = (stage.clientHeight - buttonY) * dpr;
    gl.uniform2f(uniforms.u_buttonPos, buttonPxX, buttonPxY);

    gl.uniform1f(uniforms.u_buttonRadius, BUTTON_RADIUS_CSS * dpr);
    gl.uniform1f(uniforms.u_pressScale, pressScale);
    gl.uniform1f(uniforms.u_ior, OPTICAL_IOR);
    gl.uniform1f(uniforms.u_dispersion, OPTICAL_DISPERSION);
    gl.uniform1f(uniforms.u_lensHeight, BASE_LENS_HEIGHT * dpr);

    // Expansion Uniforms
    gl.uniform1f(uniforms.u_expandProgress, expandY);
    gl.uniform1f(uniforms.u_expandProgressX, expandX);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  // Startup
  window.addEventListener('DOMContentLoaded', () => {
    if (initWebGL()) {
      resize();
      initInteractions();
      window.addEventListener('resize', resize);
      requestAnimationFrame(render);
    }
  });

})();
