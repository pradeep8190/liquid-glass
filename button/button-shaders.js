/**
 * Liquid Glass Button — WebGL GLSL Shaders
 * Perfectly Aligned Physical Perimeter Border & Seamless Optical Geometry:
 * - 100% IDENTICAL circular button in idle state
 * - Unified single analytical SDF: Eliminates double-outlines, lumpy bulges, and displaced rims
 * - Dark edge border is locked with subpixel mathematical precision to the EXACT physical perimeter of the glass card
 * - Matching Snell's Law refraction, 6-band dispersion, and Fresnel specular highlights
 */

const buttonVsSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const buttonFsSource = `
  precision highp float;

  varying vec2 v_uv;

  uniform sampler2D u_background;
  uniform vec2 u_resolution;
  uniform vec2 u_buttonPos;        // Bottom-left anchor center in WebGL pixels
  uniform float u_buttonRadius;     // Physical radius in device pixels
  uniform float u_pressScale;       // Tactile spring press scale (0.93 to 1.0)
  
  // Unfolding Fluid Animation Uniforms
  uniform float u_expandProgress;   // Vertical unfolding height (0.0 to 1.15 to 1.0)
  uniform float u_expandProgressX;  // Horizontal unfolding width (0.0 to 1.0)

  // Physical Optical Parameters
  uniform float u_ior;              // Index of Refraction (~1.52)
  uniform float u_dispersion;       // Chromatic Dispersion (~0.042)
  uniform float u_lensHeight;       // Dome Height in pixels

  // 6-Band Normalized Spectral Weights for Visible Light (700nm to 405nm)
  vec3 getSpectralWeight(int i) {
    if (i == 0) return vec3(0.40, 0.00, 0.00); // Deep Red
    if (i == 1) return vec3(0.35, 0.26, 0.00); // Amber/Yellow
    if (i == 2) return vec3(0.00, 0.40, 0.04); // Green
    if (i == 3) return vec3(0.00, 0.26, 0.28); // Cyan
    if (i == 4) return vec3(0.04, 0.08, 0.40); // Blue
    return vec3(0.21, 0.00, 0.28);              // Violet
  }

  // Analytical 2D SDF for Rounded Box
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + vec2(r);
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Analytical 2D SDF for Rounded Box with 4 unequal corner radii
  // r.x = top-right, r.y = bottom-right, r.z = top-left, r.w = bottom-left
  float sdRoundedBox4(vec2 p, vec2 b, vec4 r) {
    vec2 s = step(0.0, p);
    float radius = mix(mix(r.w, r.y, s.x), mix(r.z, r.x, s.x), s.y);
    vec2 q = abs(p) - b + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
  }

  // Analytical SDF for Plus (+) Sign
  float sdPlusIcon(vec2 p, float armLength, float armThickness, float cornerR) {
    vec2 b1 = vec2(armLength, armThickness);
    vec2 b2 = vec2(armThickness, armLength);
    float d1 = sdRoundedBox(p, b1, cornerR);
    float d2 = sdRoundedBox(p, b2, cornerR);
    return min(d1, d2);
  }

  // Physical Card Plane Shadow for Circular Button (Strictly outside glass, seamless contact)
  vec3 sampleCardPlaneCircle(vec2 uv, vec2 pCoord, float scale, float effectiveRadius) {
    vec3 bg = texture2D(u_background, uv).rgb;

    vec2 shadowOffset = vec2(0.8, -2.8) * scale;
    vec2 diff = pCoord - shadowOffset;
    float rShadow = length(diff);
    float dShadow = rShadow - effectiveRadius;
    float shadowDist = max(0.0, dShadow) / scale;

    vec2 shadowDir = normalize(vec2(0.28, -0.96));
    vec2 dirFromCenter = length(pCoord) > 1e-4 ? normalize(pCoord) : vec2(0.0, -1.0);
    float dirWeight = smoothstep(-0.35, 0.55, dot(dirFromCenter, shadowDir));

    float contactAO = exp(-shadowDist / 4.5) * 0.055;
    float penumbra = exp(-shadowDist / 14.0) * 0.045;
    float totalShadow = (contactAO + penumbra) * dirWeight;
    return bg * (1.0 - totalShadow);
  }

  // Physical Card Plane Shadow for Expanded Glass Card (Strictly outside glass, seamless contact)
  vec3 sampleCardPlaneCard(vec2 uv, vec2 pixelCoord, float scale, vec2 boxCenter, vec2 boxHalf, vec4 boxRadii) {
    vec3 bg = texture2D(u_background, uv).rgb;

    vec2 shadowOffset = vec2(0.8, -2.8) * scale;
    vec2 shadowPBox = (pixelCoord - shadowOffset) - boxCenter;
    float dShadow = sdRoundedBox4(shadowPBox, boxHalf, boxRadii);
    float shadowDist = max(0.0, dShadow) / scale;

    vec2 shadowDir = normalize(vec2(0.28, -0.96));
    vec2 diff = pixelCoord - boxCenter;
    vec2 dirFromCenter = length(diff) > 1e-4 ? normalize(diff) : vec2(0.0, -1.0);
    float dirWeight = smoothstep(-0.35, 0.55, dot(dirFromCenter, shadowDir));

    float contactAO = exp(-shadowDist / 5.0) * 0.055;
    float penumbra = exp(-shadowDist / 16.0) * 0.045;
    float totalShadow = (contactAO + penumbra) * dirWeight;
    return bg * (1.0 - totalShadow);
  }

  void main() {
    vec2 pixelCoord = v_uv * u_resolution;
    vec2 p = pixelCoord - u_buttonPos;

    float effectiveRadius = u_buttonRadius * u_pressScale;
    float scale = effectiveRadius / 36.0;

    // =========================================================================
    // 100% PURE IDLE STATE (Zero pixel deviation from original circular button)
    // =========================================================================
    if (u_expandProgress <= 0.0001 && u_expandProgressX <= 0.0001) {
      float d = length(p) - effectiveRadius;

      vec3 outsideColor = sampleCardPlaneCircle(v_uv, p, scale, effectiveRadius);

      if (d > 1.5) {
        gl_FragColor = vec4(outsideColor, 1.0);
        return;
      }

      float distInside = max(0.0, -d);
      float normDist = clamp(length(p) / effectiveRadius, 0.0, 1.0);

      float bevelWidth = 10.0 * scale;
      float domeProfile = sqrt(max(0.0, 1.0 - normDist * normDist));
      float surfaceHeight = domeProfile * u_lensHeight;

      vec2 radialDir = length(p) > 1e-4 ? normalize(p) : vec2(0.0);
      float edgeFactor = smoothstep(0.0, bevelWidth, distInside);
      float rimSmooth = smoothstep(0.0, 1.6 * scale, distInside);
      float slopeCurve = ((1.0 - edgeFactor) * 2.6 + pow(max(0.0, normDist), 1.6) * 1.8) * rimSmooth;

      vec2 normalXY = -radialDir * slopeCurve;
      vec3 normal = normalize(vec3(normalXY, 1.0));

      vec3 incident = vec3(0.0, 0.0, -1.0);
      float depth = surfaceHeight + 36.0 * scale;

      vec3 totalRefracted = vec3(0.0);
      for (int i = 0; i < 6; i++) {
        float fi = (float(i) - 2.5) / 2.5;
        float lambdaIOR = u_ior + fi * u_dispersion;

        vec3 refr = refract(incident, normal, 1.0 / lambdaIOR);
        vec2 offset = (refr.xy / abs(refr.z)) * (depth / u_resolution);

        vec2 refrUV = v_uv - offset;
        vec3 sampleCol = texture2D(u_background, refrUV).rgb;
        vec3 weight = getSpectralWeight(i);
        totalRefracted += sampleCol * weight;
      }

      float rimAntialias = smoothstep(0.0, 1.0 * scale, distInside);
      totalRefracted *= mix(0.97, 1.0, rimAntialias);

      // Clean Borderless & Shadowless Plus Icon (+)
      float armL = 8.2 * scale;
      float armT = 1.75 * scale;
      float armR = 1.0 * scale;

      float dIcon = sdPlusIcon(p, armL, armT, armR);
      float iconAlpha = smoothstep(0.65 * scale, -0.65 * scale, dIcon);
      totalRefracted = mix(totalRefracted, vec3(1.0), iconAlpha * 0.92);

      // Perimeter Edge Reflections - Specular highlights on interior glass surface
      vec2 diagAxis = normalize(vec2(0.707, 0.707));
      float diagDot = dot(radialDir, diagAxis);

      float tTR = clamp((diagDot - 0.72) / 0.26, 0.0, 1.0);
      float taperTR = smoothstep(0.0, 1.0, tTR) * sqrt(tTR);
      float widthTR = mix(0.08, 0.36, taperTR) * scale;
      float specTR = (exp(-distInside / widthTR) + exp(-distInside / (widthTR * 1.5)) * 0.18) * taperTR * 0.25;

      float tBL = clamp((-diagDot - 0.76) / 0.22, 0.0, 1.0);
      float taperBL = smoothstep(0.0, 1.0, tBL) * sqrt(tBL);
      float widthBL = mix(0.06, 0.25, taperBL) * scale;
      float specBL = (exp(-distInside / widthBL) + exp(-distInside / (widthBL * 1.5)) * 0.15) * taperBL * 0.15;

      vec3 glassReflColor = vec3(0.91, 0.95, 0.99);
      vec3 specularLayer = glassReflColor * (specTR + specBL);

      float glowWidthTR = mix(0.25 * scale, 0.90 * scale, taperTR);
      float whiteGlowTR = exp(-distInside / glowWidthTR) * taperTR * 0.06;
      float glowWidthBL = mix(0.18 * scale, 0.65 * scale, taperBL);
      float whiteGlowBL = exp(-distInside / glowWidthBL) * taperBL * 0.03;
      vec3 whiteGlowLayer = vec3(0.97, 0.98, 1.0) * (whiteGlowTR + whiteGlowBL);

      float cosTheta = clamp(normal.z, 0.0, 1.0);
      float fresnel = 0.04 + 0.96 * pow(1.0 - cosTheta, 4.0);
      float rimGlow = exp(-distInside / (0.60 * scale));
      float subtleEdgeGlow = rimGlow * fresnel * 0.07;
      vec3 edgeGlowColor = vec3(0.93, 0.96, 1.0);

      vec3 glassColor = totalRefracted + specularLayer + whiteGlowLayer + (edgeGlowColor * subtleEdgeGlow);

      // Top-Left Corner Black Edge Reflection (strictly at corner edge, mirroring right-top corner profile)
      vec2 tlAxis = normalize(vec2(-0.707, 0.707));
      float tlDot = dot(radialDir, tlAxis);
      float tTL = clamp((tlDot - 0.72) / 0.26, 0.0, 1.0);
      float taperTL = smoothstep(0.0, 1.0, tTL) * sqrt(tTL);
      float widthTL = mix(0.08, 0.36, taperTL) * scale;
      float darkArc = (exp(-distInside / widthTL) + exp(-distInside / (widthTL * 1.5)) * 0.18) * taperTL;
      vec3 darkEdgeCol = vec3(0.12, 0.14, 0.18);
      glassColor = mix(glassColor, darkEdgeCol, darkArc * 0.50);

      float edgeCoverage = smoothstep(0.65, -0.65, d);
      vec3 finalPixelColor = mix(outsideColor, glassColor, edgeCoverage);

      gl_FragColor = vec4(finalPixelColor, 1.0);
      return;
    }

    // =========================================================================
    // EXPANDED LIQUID GLASS CARD: Perfectly Aligned Perimeter Border
    // =========================================================================
    vec2 anchorBL = u_buttonPos - vec2(effectiveRadius);
    vec2 targetDim = vec2(195.0, 275.0) * scale;

    float curH = mix(effectiveRadius * 2.0, targetDim.y, max(0.0, u_expandProgress));
    float curW = mix(effectiveRadius * 2.0, targetDim.x, max(0.0, u_expandProgressX));
    vec2 curDim = vec2(curW, curH);

    vec2 boxHalf = curDim * 0.5;
    vec2 boxCenter = anchorBL + boxHalf;
    vec2 pBox = pixelCoord - boxCenter;

    // Corner Radii: Bottom-left locked to effectiveRadius; other 3 corners morph cleanly
    float cornerR = 24.0 * scale;
    float cornerMorph = clamp(max(u_expandProgress, u_expandProgressX) * 1.4, 0.0, 1.0);
    vec4 radii = mix(
      vec4(effectiveRadius),
      vec4(cornerR, cornerR, cornerR, effectiveRadius),
      cornerMorph
    );

    // Single unified analytical SDF: exact, razor-sharp perimeter with zero double-lines
    float d = sdRoundedBox4(pBox, boxHalf, radii);

    // Background & Contact Shadow (Strictly outside physical glass boundary)
    vec3 outsideColor = sampleCardPlaneCard(v_uv, pixelCoord, scale, boxCenter, boxHalf, radii);

    if (d > 1.5) {
      gl_FragColor = vec4(outsideColor, 1.0);
      return;
    }

    // Surface Normal from Exact Analytical SDF Gradient
    float eps = 1.0 * scale;
    float dx = sdRoundedBox4(pBox + vec2(eps, 0.0), boxHalf, radii) - sdRoundedBox4(pBox - vec2(eps, 0.0), boxHalf, radii);
    float dy = sdRoundedBox4(pBox + vec2(0.0, eps), boxHalf, radii) - sdRoundedBox4(pBox - vec2(0.0, eps), boxHalf, radii);
    vec2 grad = normalize(vec2(dx, dy) + 1e-4);

    float distInside = max(0.0, -d);

    // 2D Normalized Coordinates from Card Optical Center
    vec2 normP = pBox / boxHalf; // Smooth [-1.0, 1.0] across entire width and height
    float rho = length(normP);   // 0.0 at center, ~1.0 at edges, ~1.4 at corners
    vec2 radialDir = rho > 1e-4 ? normP / rho : vec2(0.0);

    float bevelWidth = 14.0 * scale;
    float edgeFactor = smoothstep(0.0, bevelWidth, distInside);
    float rimSmooth = smoothstep(0.0, 1.5 * scale, distInside);

    // Full-card volumetric convex lens: high-potency 2D slope across 100% of the surface
    float domeSlope = pow(min(rho, 1.25), 1.3) * 2.2;
    float meniscusSlope = (1.0 - edgeFactor) * 2.6;

    // Combined normal field: 2D radial expansion + perimeter meniscus
    vec2 totalNormalXY = (-radialDir * domeSlope - grad * meniscusSlope) * rimSmooth;
    vec3 normal = normalize(vec3(totalNormalXY, 1.0));

    // Volumetric 3D Dome Height for physical optical depth
    float domeProfile = sqrt(max(0.0, 1.0 - min(rho * 0.82, 0.95) * min(rho * 0.82, 0.95)));
    float surfaceHeight = domeProfile * u_lensHeight;
    float depth = surfaceHeight + 38.0 * scale;

    // Snell's Law Refraction + 6-Band Chromatic Dispersion (Crystal clarity)
    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 totalRefracted = vec3(0.0);

    for (int i = 0; i < 6; i++) {
      float fi = (float(i) - 2.5) / 2.5;
      float lambdaIOR = u_ior + fi * u_dispersion;

      vec3 refr = refract(incident, normal, 1.0 / lambdaIOR);
      vec2 offset = (refr.xy / abs(refr.z)) * (depth / u_resolution);

      vec2 refrUV = v_uv - offset;

      // Refract clean studio card & grid background (contact shadow is outside glass only)
      vec3 sampleCol = texture2D(u_background, refrUV).rgb;
      vec3 weight = getSpectralWeight(i);
      totalRefracted += sampleCol * weight;
    }

    float rimAntialias = smoothstep(0.0, 1.0 * scale, distInside);
    totalRefracted *= mix(0.97, 1.0, rimAntialias);

    // Anchor Button Icon (+ smoothly rotating 45 deg into ×)
    vec2 iconP = pixelCoord - u_buttonPos;
    float iconAngle = clamp(u_expandProgress, 0.0, 1.0) * 0.785398;
    float cosA = cos(iconAngle);
    float sinA = sin(iconAngle);
    vec2 rotIconP = vec2(cosA * iconP.x - sinA * iconP.y, sinA * iconP.x + cosA * iconP.y);

    float armL = 8.2 * scale;
    float armT = 1.75 * scale;
    float armR = 1.0 * scale;
    float dIcon = sdPlusIcon(rotIconP, armL, armT, armR);
    float iconAlpha = smoothstep(0.65 * scale, -0.65 * scale, dIcon);
    totalRefracted = mix(totalRefracted, vec3(1.0), iconAlpha * 0.92);

    // Perimeter Edge: Specular highlights on interior glass surface
    vec2 diagAxis = normalize(vec2(0.707, 0.707));
    float diagDot = dot(grad, diagAxis);

    float tTR = clamp((diagDot - 0.72) / 0.26, 0.0, 1.0);
    float taperTR = smoothstep(0.0, 1.0, tTR) * sqrt(tTR);
    float widthTR = mix(0.08, 0.36, taperTR) * scale;
    float specTR = (exp(-distInside / widthTR) + exp(-distInside / (widthTR * 1.5)) * 0.18) * taperTR * 0.25;

    float tBL = clamp((-diagDot - 0.76) / 0.22, 0.0, 1.0);
    float taperBL = smoothstep(0.0, 1.0, tBL) * sqrt(tBL);
    float widthBL = mix(0.06, 0.25, taperBL) * scale;
    float specBL = (exp(-distInside / widthBL) + exp(-distInside / (widthBL * 1.5)) * 0.15) * taperBL * 0.15;

    vec3 glassReflColor = vec3(0.91, 0.95, 0.99);
    vec3 specularLayer = glassReflColor * (specTR + specBL);

    float glowWidthTR = mix(0.25 * scale, 0.90 * scale, taperTR);
    float whiteGlowTR = exp(-distInside / glowWidthTR) * taperTR * 0.06;
    float glowWidthBL = mix(0.18 * scale, 0.65 * scale, taperBL);
    float whiteGlowBL = exp(-distInside / glowWidthBL) * taperBL * 0.03;
    vec3 whiteGlowLayer = vec3(0.97, 0.98, 1.0) * (whiteGlowTR + whiteGlowBL);

    float cosTheta = clamp(normal.z, 0.0, 1.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - cosTheta, 4.0);
    float rimGlow = exp(-distInside / (0.60 * scale));
    float subtleEdgeGlow = rimGlow * fresnel * 0.07;
    vec3 edgeGlowColor = vec3(0.93, 0.96, 1.0);

    vec3 glassColor = totalRefracted + specularLayer + whiteGlowLayer + (edgeGlowColor * subtleEdgeGlow);

    // Top-Left Corner Black Edge Reflection (strictly at corner edge, mirroring right-top corner profile)
    vec2 tlAxis = normalize(vec2(-0.707, 0.707));
    float tlDot = dot(grad, tlAxis);
    float tTL = clamp((tlDot - 0.72) / 0.26, 0.0, 1.0);
    float taperTL = smoothstep(0.0, 1.0, tTL) * sqrt(tTL);
    float widthTL = mix(0.08, 0.36, taperTL) * scale;
    float darkArc = (exp(-distInside / widthTL) + exp(-distInside / (widthTL * 1.5)) * 0.18) * taperTL;
    vec3 darkEdgeCol = vec3(0.12, 0.14, 0.18);
    glassColor = mix(glassColor, darkEdgeCol, darkArc * 0.50);

    float edgeCoverage = smoothstep(0.65, -0.65, d);
    vec3 finalPixelColor = mix(outsideColor, glassColor, edgeCoverage);

    gl_FragColor = vec4(finalPixelColor, 1.0);
  }
`;
