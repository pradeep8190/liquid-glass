/**
 * Liquid Glass Plasma Ampoule Toggle — Main Application & WebGL Orchestrator
 * Coordinates WebGL pipeline, background rasterization with substrate typography, and the frame loop.
 */

(function () {
  'use strict';

  // DOM Elements
  const stage = document.getElementById('studioStage');
  const glCanvas = document.getElementById('glcanvas');
  const bgCanvas = document.getElementById('bgCanvas');
  const overlay = document.getElementById('capsuleOverlay');

  // Device Pixel Ratio
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Optical Constants
  const OPTICAL_IOR = 1.52;
  const OPTICAL_DISPERSION = 0.052;
  const BASE_LENS_HEIGHT = 20.0;

  // Capsule Geometry Constants (CSS pixels)
  const CAPSULE_WIDTH_CSS = 360.0;
  const CAPSULE_HEIGHT_CSS = 195.0;
  const CAPSULE_RADIUS_CSS = 97.5;

  // Subsystems
  let plasmaEngine;
  let bgCtx;
  let bgTexture;

  // WebGL Pipeline
  let gl, program;
  let uniforms = {};
  let lastFrameTime = performance.now();
  let elapsedTime = 0;

  // Initialize WebGL Context
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

    const vs = compileShader(gl.VERTEX_SHADER, toggleVsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, toggleFsSource);

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    gl.useProgram(program);

    // Fullscreen Quad Buffer
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
      'u_capsuleCenter',
      'u_capsuleHalfSize',
      'u_capsuleRadius',
      'u_progress',
      'u_velocity',
      'u_time',
      'u_ior',
      'u_dispersion',
      'u_lensHeight',
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
   * Rasterize Background Texture:
   * Draws dark studio plane, aligned grid lines, and "ON" / "OFF" typography.
   * Snell's Law and 6-Band Chromatic Dispersion will refract this texture,
   * producing authentic optical bending and prismatic rainbow splitting on text edges!
   */
  function renderBackgroundTexture(progress = 0.0) {
    const w = bgCanvas.width;
    const h = bgCanvas.height;

    // 1. Deep Obsidian Studio Base
    bgCtx.fillStyle = '#0b0d11';
    bgCtx.fillRect(0, 0, w, h);

    // 2. Studio Grid Lines
    const gridSize = 40 * dpr;
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    bgCtx.lineWidth = 1 * dpr;

    const centerX = w * 0.5;
    const centerY = h * 0.5;

    // Vertical grid lines aligned to center
    for (let x = centerX % gridSize; x < w; x += gridSize) {
      bgCtx.beginPath();
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, h);
      bgCtx.stroke();
    }

    // Horizontal grid lines aligned to center
    for (let y = centerY % gridSize; y < h; y += gridSize) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(w, y);
      bgCtx.stroke();
    }

    // 3. Substrate Typography ("ON" on Right, "OFF" on Left)
    // Sits in substrate space behind the glass capsule
    bgCtx.save();
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.font = `300 ${40 * dpr}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif`;

    const offX = centerX - 84 * dpr;
    const onX = centerX + 84 * dpr;

    // Cross-fade typography based on progress:
    // progress = 0.0 (ON): "ON" is 100% visible on right, "OFF" is hidden under left solar flame
    // progress = 1.0 (OFF): "OFF" is 100% visible on left, "ON" is hidden under right emerald flame
    const offAlpha = Math.max(0.0, Math.min(1.0, (progress - 0.15) / 0.70));
    const onAlpha = Math.max(0.0, Math.min(1.0, (0.85 - progress) / 0.70));

    // "OFF" Typography on Left side
    if (offAlpha > 0.01) {
      bgCtx.shadowColor = `rgba(255, 255, 255, ${0.35 * offAlpha})`;
      bgCtx.shadowBlur = 12 * dpr;
      bgCtx.fillStyle = `rgba(255, 255, 255, ${0.88 * offAlpha})`;
      bgCtx.fillText('OFF', offX, centerY);
    }

    // "ON" Typography on Right side
    if (onAlpha > 0.01) {
      bgCtx.shadowColor = `rgba(255, 255, 255, ${0.35 * onAlpha})`;
      bgCtx.shadowBlur = 12 * dpr;
      bgCtx.fillStyle = `rgba(255, 255, 255, ${0.88 * onAlpha})`;
      bgCtx.fillText('ON', onX, centerY);
    }

    bgCtx.restore();

    // Upload to WebGL Texture
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
  }

  // Handle Resize & DPR
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

    const initialProgress = plasmaEngine ? plasmaEngine.getProgress() : 0.0;
    renderBackgroundTexture(initialProgress);
  }

  let lastRenderedProgress = -1;

  // Frame Render Loop
  function render(time) {
    const dt = Math.min((time - lastFrameTime) / 1000, 0.04);
    lastFrameTime = time;
    elapsedTime += dt;

    // Update Fluid Kinematics
    if (plasmaEngine) {
      plasmaEngine.update(dt);
    }

    const progressVal = plasmaEngine ? plasmaEngine.getProgress() : 0.0;
    const velocityVal = plasmaEngine ? plasmaEngine.getVelocity() : 0.0;

    // Dynamically update background texture when progress changes
    if (Math.abs(progressVal - lastRenderedProgress) > 0.003) {
      renderBackgroundTexture(progressVal);
      lastRenderedProgress = progressVal;
    }

    // Pass Uniforms to Shader
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(uniforms.u_background, 0);

    gl.uniform2f(uniforms.u_resolution, glCanvas.width, glCanvas.height);

    // Center of capsule in WebGL screen pixels
    const capsulePxCenter = [glCanvas.width * 0.5, glCanvas.height * 0.5];
    gl.uniform2f(uniforms.u_capsuleCenter, capsulePxCenter[0], capsulePxCenter[1]);

    gl.uniform2f(
      uniforms.u_capsuleHalfSize,
      CAPSULE_WIDTH_CSS * 0.5 * dpr,
      CAPSULE_HEIGHT_CSS * 0.5 * dpr
    );

    gl.uniform1f(uniforms.u_capsuleRadius, CAPSULE_RADIUS_CSS * dpr);

    gl.uniform1f(uniforms.u_progress, progressVal);
    gl.uniform1f(uniforms.u_velocity, velocityVal);
    gl.uniform1f(uniforms.u_time, elapsedTime);

    gl.uniform1f(uniforms.u_ior, OPTICAL_IOR);
    gl.uniform1f(uniforms.u_dispersion, OPTICAL_DISPERSION);
    gl.uniform1f(uniforms.u_lensHeight, BASE_LENS_HEIGHT * dpr);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  // Application Startup
  function boot() {
    if (initWebGL()) {
      plasmaEngine = window.createPlasmaToggleEngine(overlay, {
        initialState: true, // Start in ON state (Solar Golden)
      });

      resize();
      window.addEventListener('resize', resize);
      requestAnimationFrame(render);
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
