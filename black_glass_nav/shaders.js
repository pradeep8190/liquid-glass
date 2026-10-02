/**
 * Liquid Glass Navigation Bar — WebGL GLSL Shaders
 * Optics & Refraction Engine faithfully recreating reference images:
 * - Symmetrical rounded pebble lens with Snell's law refraction
 * - Glossy top & bottom specular reflection arcs
 * - Subtle chromatic dispersion and edge glints
 * - Interactive capillary ripple dynamics
 */

const navVsSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const navFsSource = `
  precision highp float;

  varying vec2 v_uv;

  uniform sampler2D u_background;
  uniform vec2 u_resolution;
  uniform vec2 u_thumbPos;        // Center of liquid dome in screen pixels
  uniform vec2 u_thumbHalfSize;   // Half dimensions in device pixels
  uniform float u_thumbRadius;    // Curvature radius in device pixels
  uniform float u_time;
  uniform float u_rippleTime;
  uniform vec2 u_rippleOrigin;

  // Optical physical parameters
  uniform float u_ior;
  uniform float u_dispersion;
  uniform float u_lensHeight;
  uniform vec2 u_scale;           // Deformation scale for Jelly Physics

  // Exact 2D Signed Distance Field for Rounded Box
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
    vec2 pDistorted = p / u_scale; // Apply Jelly Physics squash & stretch
    float dpr = u_thumbHalfSize.y / 63.0; // Normalized DPR from thumb half-height

    // 1. Distance to liquid glass perimeter
    float d = sdRoundedBox(pDistorted, u_thumbHalfSize, u_thumbRadius);

    // --- OUTSIDE THE LIQUID DOME ---
    if (d > 0.0) {
      // Soft ambient contact shadow under the dome on the background
      float shadowDist = d;
      float shadowAlpha = exp(-shadowDist / 18.0) * 0.18;
      vec3 bg = texture2D(u_background, v_uv).rgb;
      gl_FragColor = vec4(bg * (1.0 - shadowAlpha), 1.0);
      return;
    }

    // --- INSIDE THE LIQUID DOME ---
    float distInside = -d;
    vec2 pCSS = pDistorted / dpr; // Apply distortion to highlights

    // Smooth meniscus border - widen it to cover the track edge so refraction is continuous!
    float bevelWidthCSS = 48.0;
    float bevelWidth = bevelWidthCSS * dpr;

    float surfaceHeight = u_lensHeight;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    vec2 eps = vec2(1.0, 0.0);

    if (distInside < bevelWidth) {
      float t = clamp(distInside / bevelWidth, 0.0, 1.0);
      float smoothT = smoothstep(0.0, 1.0, t);
      float curve = sqrt(max(0.0, 1.0 - (1.0 - smoothT) * (1.0 - smoothT)));
      surfaceHeight = curve * u_lensHeight;

      float dX = sdRoundedBox(pDistorted + eps.xy, u_thumbHalfSize, u_thumbRadius) - sdRoundedBox(pDistorted - eps.xy, u_thumbHalfSize, u_thumbRadius);
      float dY = sdRoundedBox(pDistorted + eps.yx, u_thumbHalfSize, u_thumbRadius) - sdRoundedBox(pDistorted - eps.yx, u_thumbHalfSize, u_thumbRadius);
      vec2 sdfGrad = normalize(vec2(dX, dY) + 1e-6);

      float safeT = min(smoothT, 0.98);
      float slope = (1.0 - safeT) / sqrt(max(0.001, 1.0 - (1.0 - safeT) * (1.0 - safeT)));
      slope = slope * (u_lensHeight / bevelWidth) * (1.0 - smoothT);
      slope = min(slope, 4.5);

      normal = normalize(vec3(-sdfGrad * slope, 1.0));
    }

    // Interactive capillary ripple wave on tab click/touch
    if (u_rippleTime < 1.8) {
      float distToClick = length(pixelCoord - u_rippleOrigin);
      float waveRadius = u_rippleTime * 320.0;
      float waveDist = abs(distToClick - waveRadius);
      float waveDecay = exp(-u_rippleTime * 4.2) * exp(-waveDist * 0.12);
      float ripple = sin(distToClick * 0.24 - u_time * 24.0) * 2.8 * waveDecay;
      surfaceHeight += ripple;
    }

    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float depth = surfaceHeight + 28.0 * dpr;

    // 2. Physical Snell's Law Refraction with 6-Spectral Dispersion
    vec3 totalRefracted = vec3(0.0);

    for (int i = 0; i < 6; i++) {
      float fi = (float(i) - 2.5) / 2.5;
      float lambdaIOR = u_ior + fi * u_dispersion;

      vec3 refr = refract(incident, normal, 1.0 / lambdaIOR);
      vec2 offset = (refr.xy / abs(refr.z)) * (depth / u_resolution);

      vec3 sampleCol = texture2D(u_background, v_uv - offset).rgb;
      vec3 weight = getSpectralWeight(i);
      totalRefracted += sampleCol * weight;
    }

    // Enforce solid black liquid color on the top and bottom arcs of the lens
    // where it overhangs the physical track, preventing it from refracting the grey background
    float unscaledY = p.y / dpr;
    float overhangDarkening = smoothstep(24.0, 50.0, abs(unscaledY));
    totalRefracted = mix(totalRefracted, vec3(0.02, 0.02, 0.03), overhangDarkening * 0.98);

    // 3. Pure Physical Glass Optics: Specular Highlights & Fresnel Rim Lighting
    // Directional specular reflection on curved dome crests
    float specTop = 0.0; // Completely removed white reflection at the top of the lens

    // Bottom curved specular reflection (subtle ambient reflection on lower rim)
    vec3 bottomLightDir = normalize(vec3(0.0, -0.85, 0.45));
    vec3 bottomHalfVec = normalize(bottomLightDir + viewDir);
    float bottomNdotH = max(0.0, dot(normal, bottomHalfVec));
    // Fix smoothstep undefined behavior (edge0 > edge1) by using 1.0 - smoothstep(edge1, edge0, x)
    float bottomSpecArea = (1.0 - smoothstep(-52.0, -18.0, pCSS.y)) * (1.0 - smoothstep(16.0, 52.0, abs(pCSS.x)));
    float specBottom = pow(bottomNdotH, 28.0) * 0.38 * bottomSpecArea;

    // Removed top corner chromatic glints
    vec3 cornerGlintColor = vec3(0.0);

    // Physical Fresnel rim light along glass perimeter (suppressed on top to eliminate white edge/shadow)
    float NdotV = max(0.0, dot(normal, viewDir));
    float fresnel = pow(1.0 - NdotV, 3.2);
    float edgeGlow = exp(-distInside / (1.2 * dpr));
    float topRimSuppression = 1.0 - smoothstep(-12.0, 4.0, pCSS.y); // Zero at the top of the lens
    vec3 rimLight = vec3(0.92, 0.95, 1.0) * (fresnel * 0.7 + 0.3) * edgeGlow * 0.40 * topRimSuppression;

    // Composite Optics
    vec3 finalColor = totalRefracted;
    finalColor += (specTop + specBottom) * vec3(1.0);
    finalColor += cornerGlintColor;
    finalColor += rimLight;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
