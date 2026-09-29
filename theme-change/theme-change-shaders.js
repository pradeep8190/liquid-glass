/**
 * Liquid Glass Theme Switch — WebGL GLSL Shaders
 * Premium Liquid Glass Optics:
 * - Upright pebble dome (114px x 140px)
 * - Soft, balanced ambient contact shadow (gentle depth, zero dark smudge)
 * - Wave-shaped convex meniscus refraction:
 *             \
 *    ------/
 * - Delicate, fine specular glint along the wave curve (no thick white ring)
 * ZERO modifications to original files.
 */

const toggleVsSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const toggleFsSource = `
  precision highp float;

  varying vec2 v_uv;

  uniform sampler2D u_background;
  uniform vec2 u_resolution;
  uniform vec2 u_thumbPos;        // Center of liquid dome in screen pixels
  uniform vec2 u_thumbHalfSize;   // Half dimensions (57.0, 70.0)
  uniform float u_thumbRadius;    // Curvature radius (57.0)
  uniform float u_time;
  uniform float u_rippleTime;
  uniform vec2 u_rippleOrigin;

  // Optical physical parameters
  uniform float u_ior;
  uniform float u_dispersion;
  uniform float u_lensHeight;
  uniform float u_themeProgress; // 0.0 = Light, 1.0 = Dark

  // Exact 2D Signed Distance Field for Rounded Pebble Dome
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + vec2(r);
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Normalized spectral weights for visible wavelengths
  vec3 getSpectralWeight(int i) {
    if (i == 0) return vec3(0.40, 0.00, 0.00); // Deep Red
    if (i == 1) return vec3(0.35, 0.26, 0.00); // Amber / Yellow
    if (i == 2) return vec3(0.00, 0.40, 0.04); // Green
    if (i == 3) return vec3(0.00, 0.26, 0.28); // Cyan
    if (i == 4) return vec3(0.04, 0.08, 0.40); // Blue
    return vec3(0.21, 0.00, 0.28);              // Violet
  }

  void main() {
    vec2 pixelCoord = v_uv * u_resolution;
    vec2 p = pixelCoord - u_thumbPos;

    // 1. Distance to liquid glass perimeter
    float d = sdRoundedBox(p, u_thumbHalfSize, u_thumbRadius);

    // --- OUTSIDE THE LIQUID DOME ---
    // Pure, clean studio background (no fake outer black shadow smudge)
    if (d > 0.0) {
      gl_FragColor = texture2D(u_background, v_uv);
      return;
    }

    // --- INSIDE THE LIQUID DOME ---
    float distInside = -d;

    // DPR: derive from the uniform (thumbHalfHeight is 70 CSS px, passed as 70*dpr)
    float dpr = u_thumbHalfSize.y / 70.0;
    vec2 pCSS = p / dpr; // Normalize to CSS pixel space

    // 2. Wave-Shaped Dynamic Meniscus Curvature:
    // Flaring where the track meets the dome (at y = +/-35 CSS px), forming the wave:
    //             \
    //    ------/
    float overlapDir = mix(1.0, -1.0, u_themeProgress);
    float xFacingPill = pCSS.x * overlapDir;

    // Track horizontal borders are at y = +/-35 CSS px
    float pillHalfH = 35.0;
    float distToTrackBorder = abs(abs(pCSS.y) - pillHalfH);

    // Smooth flared meniscus at track junction (y = +/-35 CSS px)
    float sideWeight = smoothstep(-12.0, 32.0, xFacingPill);
    float trackBorderFlare = exp(-distToTrackBorder * 0.068) * 13.5 * sideWeight;

    // Smooth continuous wave body tapering towards dome apex
    float waveBelly = smoothstep(56.0, 0.0, abs(pCSS.y)) * smoothstep(-10.0, 35.0, xFacingPill) * 6.0;

    // Meniscus width in CSS px, then scaled to device px
    float bevelWidthCSS = 6.0 + trackBorderFlare + waveBelly;
    float bevelWidth = bevelWidthCSS * dpr;

    float surfaceHeight = u_lensHeight;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    vec2 eps = vec2(1.0, 0.0);

    if (distInside < bevelWidth) {
      // Meniscus zone: smooth curved drop to surface
      float t = clamp(distInside / bevelWidth, 0.0, 1.0);
      float smoothT = smoothstep(0.0, 1.0, t);
      float curve = sqrt(max(0.0, 1.0 - (1.0 - smoothT) * (1.0 - smoothT)));
      surfaceHeight = curve * u_lensHeight;

      // SDF gradient for normal direction (stays in device pixels)
      float dX = sdRoundedBox(p + eps.xy, u_thumbHalfSize, u_thumbRadius) - sdRoundedBox(p - eps.xy, u_thumbHalfSize, u_thumbRadius);
      float dY = sdRoundedBox(p + eps.yx, u_thumbHalfSize, u_thumbRadius) - sdRoundedBox(p - eps.yx, u_thumbHalfSize, u_thumbRadius);
      vec2 sdfGrad = normalize(vec2(dX, dY) + 1e-6);

      float safeT = min(smoothT, 0.98);
      float slope = (1.0 - safeT) / sqrt(max(0.001, 1.0 - (1.0 - safeT) * (1.0 - safeT)));
      slope = slope * (u_lensHeight / bevelWidth) * (1.0 - smoothT);
      slope = min(slope, 4.0);

      normal = normalize(vec3(-sdfGrad * slope, 1.0));
    }

    // Capillary ripple wave on click
    if (u_rippleTime < 2.0) {
      float distToClick = length(pixelCoord - u_rippleOrigin);
      float waveRadius = u_rippleTime * 350.0;
      float waveDist = abs(distToClick - waveRadius);
      float waveDecay = exp(-u_rippleTime * 4.0) * exp(-waveDist * 0.10);
      float ripple = sin(distToClick * 0.22 - u_time * 26.0) * 2.5 * waveDecay;
      surfaceHeight += ripple;
    }

    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float depth = surfaceHeight + 38.0 * dpr;

    // 3. Positive Snell's Law Refraction (Expanding track edges into the wave)
    vec3 totalRefracted = vec3(0.0);

    for (int i = 0; i < 6; i++) {
      float fi = (float(i) - 2.5) / 2.5;
      float lambdaIOR = u_ior + fi * u_dispersion;

      vec3 refr = refract(incident, normal, 1.0 / lambdaIOR);
      vec2 offset = (refr.xy / abs(refr.z)) * (depth / u_resolution);

      // Minus offset = positive magnification expanding outward into the wave
      vec3 sampleCol = texture2D(u_background, v_uv - offset).rgb;
      vec3 weight = getSpectralWeight(i);
      totalRefracted += sampleCol * weight;
    }

    // Edge softening at the physical glass perimeter
    float edgeDarkening = smoothstep(0.0, 2.0, distInside);
    totalRefracted *= mix(0.85, 1.0, edgeDarkening);

    // Very subtle grey ambient depth on the lower dome
    float domeLowerShade = smoothstep(10.0, -55.0, pCSS.y) * mix(0.05, 0.10, u_themeProgress);
    totalRefracted *= (1.0 - domeLowerShade);

    // 4. Physical Directional Light Reflection (all CSS-pixel thresholds)
    vec3 keyLight = normalize(vec3(-0.45, 0.70, 0.45));
    vec3 halfKey = normalize(keyLight + viewDir);
    float NdotH = max(0.0, dot(normal, halfKey));

    // Specular wave glint on the wave crest
    float waveGlintArea = smoothstep(-5.0, 35.0, xFacingPill) * smoothstep(12.0, 48.0, pCSS.y);
    float specSharp = pow(NdotH, 60.0) * mix(0.35, 0.20, u_themeProgress) * waveGlintArea;

    // Edge light width (CSS px scaled to device px)
    float outsidePillH = smoothstep(22.0, 40.0, abs(pCSS.y));
    float glowWidth = mix(0.75, 1.40, outsidePillH) * dpr;

    // Center Top of the Dome: apex region in CSS px
    float centerTopWeight = smoothstep(36.0, 0.0, abs(pCSS.x)) * smoothstep(30.0, 65.0, pCSS.y);

    // 1. At the center top: light intensity is LOW
    float baseIntensity = mix(0.18, 0.48, outsidePillH);
    float glowIntensity = baseIntensity * (1.0 - centerTopWeight * 0.70) * mix(1.0, 0.75, u_themeProgress);

    // 2. At the center top: color is GREYISH rather than stark white
    vec3 brightColor = vec3(1.0);
    vec3 greyishColor = vec3(0.66, 0.69, 0.73);
    vec3 rimColor = mix(brightColor, greyishColor, centerTopWeight * 0.85);

    float NdotV = max(0.0, dot(normal, viewDir));
    float fresnel = pow(1.0 - NdotV, 3.2);

    // Exponential light falloff (distInside is device px, glowWidth is device px)
    float edgeGlow = exp(-distInside / glowWidth);
    vec3 rimLight = rimColor * (fresnel * 0.65 + 0.35) * edgeGlow * glowIntensity;

    vec3 finalColor = totalRefracted + specSharp * vec3(1.0) + rimLight;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
