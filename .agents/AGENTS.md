# Physical Glass & Pixel-Level Optical UI Rules

## 1. Core Engineering Philosophy
- **Pixel-Level Mathematical Precision**: Every visual attribute (light position, shadow dropoff, refraction offset, bevel slope, specular glint) must be mathematically calculated and surgically placed.
- **Physical Grounding Over Arbitrary Aesthetics**: Never add random blur layers, arbitrary black smudges, fake outer shadow glows, or artificial brightness. Every optical phenomenon must have geometric and physical justification.
- **Iterative Surgical Refinement**: Masterpiece glass components (like the 99.99% Apple-level liquid glass toggle and sliders) require careful, continuous micro-tuning and feedback across iterations. Never settle for generic one-shot approximations.

---

## 2. Optical & Physical Standards

### A. Signed Distance Fields (SDF) & Surface Normals
- Use exact analytical 2D/3D Signed Distance Fields (`sdRoundedBox`, capsule, or custom SDFs).
- Surface normals $\vec{N}$ must be computed from continuous mathematical slope derivatives and SDF gradient vectors ($\nabla \text{SDF}$) to avoid banding, noise, or hard optical artifacts.
- Meniscus curvatures and boundary transitions must be continuous, smooth, and defined by exact analytical profiles (e.g. circular/elliptical arcs, smoothstep transitions, exponential flares).

### B. Snell's Law & Chromatic Dispersion
- Refraction ray offsets must follow Snell's Law: $\vec{R} = \text{refract}(\vec{I}, \vec{N}, \eta)$ with true indices of refraction ($n_{\text{glass}} \approx 1.50 - 1.54$).
- Chromatic dispersion must decompose light across wavelength spectrums (e.g. 6-band spectral weights from deep red to violet) to produce genuine physical dispersion fringing.

### C. Fresnel & Specular Physics
- Use exact Fresnel equations ($F_0 + (1 - F_0)(1 - \cos\theta)^5$) to govern edge reflectance and transmission at grazing angles.
- Specular highlights must use calibrated 3D directional key-light and half-vectors ($\vec{N} \cdot \vec{H}$ Blinn-Phong/GGX) matched to physical light source angles.
- Rim lighting must have exponential decay falloff calibrated in exact CSS/device pixel units.

### D. Shadows & Occlusion
- Contact shadows and ambient occlusion must be depth-attenuated and physically grounded to contact surfaces—no dark smudge rings outside the physical glass boundary.

---

## 3. Workflow & Modification Protocol
- Always maintain clean modular separation (HTML, CSS styling, GLSL shader math, and interactive JS engine).
- Make precise, surgical adjustments to parameters and equations upon request without breaking existing mathematical balances.
