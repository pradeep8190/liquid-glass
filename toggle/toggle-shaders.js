/**
 * Liquid Glass Plasma Ampoule Toggle — WebGL GLSL Optical Shaders
 * - Analytical 2D/3D Capsule SDF Geometry & Continuous Surface Gradient
 * - Snell's Law Positive Refraction with 6-Band Chromatic Dispersion
 * - Volumetric Ionized Gas Plasma Comet with Asymmetric Fluid Smoke Tail
 * - Prismatic Spectral Dispersion on Substrate Typography ("ON" / "OFF")
 * - Directional Blinn-Phong Keylight Specular Glints & Calibrated Fresnel Rim
 * - Physically Grounded Contact Shadow onto Dark Engineering Studio Grid
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
  uniform vec2 u_capsuleCenter;    // Capsule center in WebGL pixels
  uniform vec2 u_capsuleHalfSize;  // Half dimensions (halfWidth, halfHeight)
  uniform float u_capsuleRadius;   // Radius of the capsule dome (halfHeight)
  uniform float u_progress;        // 0.0 = ON (Left, Solar), 1.0 = OFF (Right, Emerald)
  uniform float u_velocity;        // Dynamic velocity for fluid momentum stretch
  uniform float u_time;            // Elapsed time for fluid smoke turbulence

  // Physical Optical Parameters
  uniform float u_ior;             // Index of Refraction (~1.52)
  uniform float u_dispersion;      // Chromatic Dispersion coefficient (~0.052)
  uniform float u_lensHeight;      // 3D convex dome thickness

  // 6-Band Normalized Spectral Weights for Visible Light (700nm to 405nm)
  vec3 getSpectralWeight(int i) {
    if (i == 0) return vec3(0.40, 0.00, 0.00); // Deep Red
    if (i == 1) return vec3(0.35, 0.26, 0.00); // Amber/Yellow
    if (i == 2) return vec3(0.00, 0.40, 0.04); // Green
    if (i == 3) return vec3(0.00, 0.26, 0.28); // Cyan
    if (i == 4) return vec3(0.04, 0.08, 0.40); // Blue
    return vec3(0.21, 0.00, 0.28);              // Violet
  }

  // Exact Analytical 2D Signed Distance Field for Stadium Capsule
  float sdCapsule(vec2 p, vec2 halfSize, float radius) {
    float straightHalfX = max(0.0, halfSize.x - radius);
    vec2 q = abs(p) - vec2(straightHalfX, 0.0);
    return length(vec2(max(q.x, 0.0), q.y)) - radius;
  }

  // Directional Contact Shadow on Studio Grid Plane
  vec3 sampleStageShadow(vec2 uv, vec2 p, vec2 halfSize, float radius, float scale) {
    vec3 bg = texture2D(u_background, uv).rgb;

    vec2 shadowOffset = vec2(0.5, -4.5) * scale;
    vec2 shadowP = p - shadowOffset;
    float dShadow = sdCapsule(shadowP, halfSize, radius);
    float shadowDist = max(0.0, dShadow) / scale;

    vec2 shadowDir = normalize(vec2(0.20, -0.98));
    vec2 dirFromCenter = length(p) > 1e-4 ? normalize(p) : vec2(0.0, -1.0);
    float dirWeight = smoothstep(-0.30, 0.65, dot(dirFromCenter, shadowDir));

    // Two-tier contact AO and soft penumbra
    float contactAO = exp(-shadowDist / 6.5) * 0.16;
    float penumbra = exp(-shadowDist / 26.0) * 0.10;
    float totalShadow = (contactAO + penumbra) * dirWeight;

    return bg * (1.0 - totalShadow);
  }

  void main() {
    vec2 pixelCoord = v_uv * u_resolution;
    vec2 p = pixelCoord - u_capsuleCenter;

    float scale = u_capsuleRadius / 80.0;

    // 1. Distance to Glass Capsule Perimeter
    float d = sdCapsule(p, u_capsuleHalfSize, u_capsuleRadius);

    // Outside the Glass Capsule: Dark Studio Grid Plane with grounded shadow
    vec3 outsideColor = sampleStageShadow(v_uv, p, u_capsuleHalfSize, u_capsuleRadius, scale);

    if (d > 1.8 * scale) {
      gl_FragColor = vec4(outsideColor, 1.0);
      return;
    }

    // 2. Analytical Surface Normal via Continuous Gradient
    float eps = 1.0 * scale;
    float dx = sdCapsule(p + vec2(eps, 0.0), u_capsuleHalfSize, u_capsuleRadius) - sdCapsule(p - vec2(eps, 0.0), u_capsuleHalfSize, u_capsuleRadius);
    float dy = sdCapsule(p + vec2(0.0, eps), u_capsuleHalfSize, u_capsuleRadius) - sdCapsule(p - vec2(0.0, eps), u_capsuleHalfSize, u_capsuleRadius);
    vec2 grad = normalize(vec2(dx, dy) + 1e-4);

    float distInside = max(0.0, -d);

    // Normalized coordinates across capsule dome
    vec2 normP = p / u_capsuleHalfSize;
    float rho = length(normP);
    vec2 radialDir = rho > 1e-4 ? normP / rho : vec2(0.0);

    float bevelWidth = 22.0 * scale;
    float edgeFactor = smoothstep(0.0, bevelWidth, distInside);
    float rimSmooth = smoothstep(0.0, 1.8 * scale, distInside);

    // 3D Convex Dome Profile & Surface Normal
    float domeSlope = pow(min(rho, 1.3), 1.25) * 1.85;
    float meniscusSlope = (1.0 - edgeFactor) * 2.8;

    vec2 totalNormalXY = (-radialDir * domeSlope - grad * meniscusSlope) * rimSmooth;
    vec3 normal = normalize(vec3(totalNormalXY, 1.0));

    // Volumetric 3D Optical Depth
    float domeProfile = sqrt(max(0.0, 1.0 - min(rho * 0.85, 0.96) * min(rho * 0.85, 0.96)));
    float surfaceHeight = domeProfile * u_lensHeight;
    float depth = surfaceHeight + 35.0 * scale;

    // 3. Positive Snell's Law Refraction + 6-Band Chromatic Dispersion
    // Refracts background grid and "ON" / "OFF" typography with real spectral dispersion!
    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
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

    // Obsidian glass substrate body tint
    vec3 glassColor = totalRefracted * 0.88;

    // 4. Specular Keylight Highlights (Top-Left Studio Lighting)
    vec3 keyLight = normalize(vec3(-0.45, 0.70, 0.55));
    vec3 halfKey = normalize(keyLight + viewDir);
    float NdotH = max(0.0, dot(normal, halfKey));

    // Sharp specular bead glint
    float specSharp = pow(NdotH, 85.0) * 0.45;
    // Broad convex dome sheen
    float specBroad = pow(NdotH, 18.0) * 0.18;
    vec3 specularHighlights = vec3(0.96, 0.98, 1.0) * (specSharp + specBroad);

    // Top-Rail Specular Crest (Continuous horizontal highlight along the top edge)
    float topCrest = smoothstep(0.72, 0.98, grad.y);
    float topWidth = 0.42 * scale;
    float specTop = exp(-distInside / topWidth) * topCrest * 0.32;
    specularHighlights += vec3(0.96, 0.98, 1.0) * specTop;

    // 5. Fresnel Grazing Edge Luminance
    float cosTheta = clamp(normal.z, 0.0, 1.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - cosTheta, 3.8);
    float rimGlow = exp(-distInside / (0.75 * scale)) * fresnel * 0.22;
    vec3 fresnelGlow = vec3(0.94, 0.97, 1.0) * rimGlow;

    // =========================================================================
    // 6. Volumetric Living Plasma Comet & Fluid Smoke Engine
    // =========================================================================
    // Travel range between Left and Right poles
    float travelDist = u_capsuleHalfSize.x - u_capsuleRadius * 0.92;
    // Progress: 0.0 = Left (ON), 1.0 = Right (OFF)
    float coreX = mix(-travelDist, travelDist, u_progress);
    vec2 corePos = vec2(coreX, 0.0);
    vec2 pRel = p - corePos;

    // Smooth continuous color & orientation blend across the ENTIRE slide (Zero sudden flip!)
    float tBlend = smoothstep(0.0, 1.0, u_progress);

    // --- State 1: Solar Profile (Head on Left, Tail streams Right) ---
    float alongSpineSolar = pRel.x;
    float sXSolar = alongSpineSolar > 0.0 ? (145.0 * scale) : (58.0 * scale);
    float sYSolar = mix(66.0, 76.0, smoothstep(0.0, 100.0 * scale, max(0.0, alongSpineSolar))) * scale;
    float rNormSolar = length(vec2(alongSpineSolar / sXSolar, pRel.y / sYSolar));
    float ISolar = exp(-1.15 * rNormSolar * rNormSolar);

    vec3 colDeepSmokeSolar = vec3(0.85, 0.32, 0.01) * pow(ISolar, 1.25);
    vec3 colWarmAmberSolar = vec3(0.98, 0.64, 0.02) * pow(ISolar, 2.00);
    vec3 colCanaryCoreSolar = vec3(1.00, 0.92, 0.05) * pow(ISolar, 3.40);
    vec3 solarColor = colDeepSmokeSolar * 0.22 + colWarmAmberSolar * 0.36 + colCanaryCoreSolar * 0.44;

    // --- State 2: Emerald Profile (Head on Right, Tail streams Left) ---
    float alongSpineEmerald = -pRel.x;
    float sXEmerald = alongSpineEmerald > 0.0 ? (145.0 * scale) : (58.0 * scale);
    float sYEmerald = mix(66.0, 76.0, smoothstep(0.0, 100.0 * scale, max(0.0, alongSpineEmerald))) * scale;
    float rNormEmerald = length(vec2(alongSpineEmerald / sXEmerald, pRel.y / sYEmerald));
    float IEmerald = exp(-1.15 * rNormEmerald * rNormEmerald);

    vec3 colDeepJadeEmerald = vec3(0.02, 0.45, 0.16) * pow(IEmerald, 1.25);
    vec3 colLuminousEmerald = vec3(0.06, 0.84, 0.36) * pow(IEmerald, 2.00);
    vec3 colApexLimeEmerald = vec3(0.18, 0.98, 0.48) * pow(IEmerald, 3.40);
    vec3 emeraldColor = colDeepJadeEmerald * 0.22 + colLuminousEmerald * 0.36 + colApexLimeEmerald * 0.44;

    // Seamless Fluid Metamorphosis:
    // Core moves smoothly from left to right, smoothly shifting color and shape with zero flip!
    vec3 activePlasma = mix(solarColor, emeraldColor, tBlend);

    // =========================================================================
    // 7. Physical Apex Reflection Crescent (Micro-Thin Optical Meniscus Highlight)
    // Strictly at the curved end-cap apex (around y = 0), NOT a continuous border!
    // =========================================================================
    float straightHalfX = max(0.0, u_capsuleHalfSize.x - u_capsuleRadius);
    float yApexNorm = abs(p.y) / (28.0 * scale);
    float apexTaper = exp(-pow(yApexNorm, 2.2)); // Tapers smoothly to 0 as y departs from centerline

    // Left End-Cap Apex Reflection (Smoothly fades out as plasma leaves left side)
    float isLeftCap = smoothstep(-straightHalfX + 10.0 * scale, -straightHalfX - 5.0 * scale, p.x);
    float leftInnerLine = exp(-pow((distInside - 0.75 * scale) / (0.35 * scale), 2.0));
    float leftEdgeGlint = exp(-distInside / (0.45 * scale));
    vec3 leftReflection = (vec3(1.0, 0.98, 0.92) * leftEdgeGlint * 0.75 + vec3(0.98, 0.64, 0.02) * leftInnerLine * 0.95) * apexTaper * isLeftCap * (1.0 - tBlend);

    // Right End-Cap Apex Reflection (Smoothly fades in as plasma arrives at right side)
    float isRightCap = smoothstep(straightHalfX - 10.0 * scale, straightHalfX + 5.0 * scale, p.x);
    float rightInnerLine = exp(-pow((distInside - 0.75 * scale) / (0.35 * scale), 2.0));
    float rightEdgeGlint = exp(-distInside / (0.45 * scale));
    vec3 rightReflection = (vec3(0.92, 1.0, 0.95) * rightEdgeGlint * 0.75 + vec3(0.06, 0.84, 0.36) * rightInnerLine * 0.95) * apexTaper * isRightCap * tBlend;

    vec3 apexOpticalReflection = leftReflection + rightReflection;

    // Combine Glass Optics with Volumetric Plasma & Apex Reflection
    glassColor += activePlasma + apexOpticalReflection;
    glassColor += specularHighlights + fresnelGlow;

    // 8. Subpixel Anti-Aliased Glass Boundary Blend
    float edgeCoverage = smoothstep(0.65, -0.65, d);
    vec3 finalColor = mix(outsideColor, glassColor, edgeCoverage);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
