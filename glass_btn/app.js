/**
 * Pure Liquid Glass — WebGL Engine
 * Standalone circular liquid glass button on pure white background.
 * Zero text, zero click interactions, pure optical physics.
 */

(function () {
  'use strict';

  // Configuration
  const SHOW_ICON = false; // Set to true to display center plus icon, false for pure crystal glass
  const BUTTON_RADIUS_CSS = 44.0;
  const OPTICAL_IOR = 1.54;
  const OPTICAL_DISPERSION = 0.055;
  const BASE_LENS_HEIGHT = 16.0;

  // DOM Elements
  const stage = document.getElementById('stageContainer');
  const glCanvas = document.getElementById('glcanvas');
  const bgCanvas = document.getElementById('bgCanvas');

  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Position State (Centered)
  let buttonX = 0;
  let buttonY = 0;

  // WebGL State
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

    const vs = compileShader(gl.VERTEX_SHADER, glassVsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, glassFsSource);

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

    // Uniform Locations
    const uniformNames = [
      'u_background',
      'u_resolution',
      'u_buttonPos',
      'u_buttonRadius',
      'u_pressScale',
      'u_showIcon',
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
   * Render Background:
   * Crisp white background with delicate optical grid to showcase refraction
   */
  function renderBackground() {
    const w = bgCanvas.width;
    const h = bgCanvas.height;

    // Pure white background
    bgCtx.fillStyle = '#ffffff';
    bgCtx.fillRect(0, 0, w, h);

    // Delicate subtle studio grid lines for physical refraction demonstration
    const gridSize = 64 * dpr;
    const gridOffsetX = (w % gridSize) * 0.5;
    const gridOffsetY = (h % gridSize) * 0.5;

    bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
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

  // Handle Resize & Centering
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

    // Center circular glass button in viewport
    buttonX = width * 0.5;
    buttonY = height * 0.5;

    renderBackground();
    drawFrame();
  }

  function drawFrame() {
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(uniforms.u_background, 0);

    gl.uniform2f(uniforms.u_resolution, glCanvas.width, glCanvas.height);

    // WebGL Y-axis is inverted relative to CSS screen coordinates
    const buttonPxX = buttonX * dpr;
    const buttonPxY = (stage.clientHeight - buttonY) * dpr;
    gl.uniform2f(uniforms.u_buttonPos, buttonPxX, buttonPxY);

    gl.uniform1f(uniforms.u_buttonRadius, BUTTON_RADIUS_CSS * dpr);
    gl.uniform1f(uniforms.u_pressScale, 1.0);
    gl.uniform1f(uniforms.u_showIcon, SHOW_ICON ? 1.0 : 0.0);
    gl.uniform1f(uniforms.u_ior, OPTICAL_IOR);
    gl.uniform1f(uniforms.u_dispersion, OPTICAL_DISPERSION);
    gl.uniform1f(uniforms.u_lensHeight, BASE_LENS_HEIGHT * dpr);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // Startup
  window.addEventListener('DOMContentLoaded', () => {
    if (initWebGL()) {
      resize();
      window.addEventListener('resize', resize);
    }
  });

})();
