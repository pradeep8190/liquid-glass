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

  // CPU Optimization: Only rasterize the bounding box of the track!
  // The studio background outside the track is static.
  ctx.beginPath();
  const padding = 160;
  ctx.rect(state.trackX - config.trackWidth / 2 - padding, state.trackY - config.trackHeight / 2 - padding, config.trackWidth + padding * 2, config.trackHeight + padding * 2);
  ctx.clip();

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
  // Apply Jelly distortion to the physical clipping path!
  ctx.save();
  ctx.translate(state.thumbX, state.thumbY);
  ctx.scale(state.scaleX, state.scaleY);
  ctx.translate(-state.thumbX, -state.thumbY);
  drawRoundedPill(ctx, state.thumbX, state.thumbY, config.thumbHalfWidth * 2, config.thumbHalfHeight * 2, config.thumbRadius);
  ctx.restore();
  ctx.clip();

  TABS.forEach((tab, index) => {
    const tabX = getTabPosition(index);
    // Scale distance by the physical stretch so glow matches the stretched boundary exactly
    const distToThumb = Math.abs(state.thumbX - tabX) / state.scaleX;

    // Intensity: 1.0 when bubble is centered over tab, 0.0 when far
    const rawInfluence = Math.max(0, 1.0 - distToThumb / 120.0);
    
    // Prevent harsh flashing of icons when flying past them at extreme speeds
    const speed = Math.abs(state.velThumbX);
    const speedFade = Math.max(0.0, 1.0 - (speed / 2500.0));
    
    const intensity = rawInfluence * rawInfluence * (3.0 - 2.0 * rawInfluence) * speedFade;

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
