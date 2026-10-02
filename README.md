# 🧪 Liquid Glass — Physical Realism & Shader UI Suite

[![WebGL](https://img.shields.io/badge/WebGL-2.0-blue.svg?logo=webgl&logoColor=white)](https://get.webgl.org/)
[![GLSL](https://img.shields.io/badge/GLSL-Shaders-green.svg)](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Physics](https://img.shields.io/badge/Physics-Physical_Realism-orange.svg)]()

> A hyper-realistic, physically accurate **Liquid Glass UI component library** built from the ground up with raw **WebGL and GLSL fragment shaders**. Features optical refraction, chromatic dispersion, dynamic specular highlights, normal mapping, and spring kinematics.

---

## ✨ Component Gallery

| Component | Description | Technologies |
|---|---|---|
| **[Ruler](./ruler)** | Interactive liquid glass measurement ruler with continuous tick graduation, unit switching (cm/in), and spring inertia. | WebGL, Pure JS, CSS Glass |
| **[Tab Bar](./tab_bar)** | Liquid floating dock with dynamic lens pill refraction, squish/stretch gestures, and tactile feedback. | WebGL, GLSL Shaders, Spring Kinematics |
| **[Button](./button)** | Ray-bent liquid glass action button with caustic inner reflection and edge highlights. | WebGL 2.0, GLSL, CSS |
| **[Glass Button](./glass_btn)** | Minimalist frosted glass button with fluid mouse-following refraction lens. | GLSL, Custom Shaders |
| **[Search Bar](./search-bar)** | Fluid search capsule with optical glass refraction and background magnification. | WebGL Shaders, Vanilla JS |
| **[Slider](./slider)** | Viscous fluid slider thumb with liquid meniscus and spring damping physics. | WebGL, Canvas, Math Spring |
| **[Theme Change](./theme-change)** | Fluid distortion wave transition for dark/light mode switching. | Fullscreen GLSL Quad |
| **[Black Glass Nav](./black_glass_nav)** | Dark tinted liquid glass navigation dock with refractive lens pill and smooth kinematics. | WebGL, GLSL Shaders, Spring Physics |
| **[Toggle](./toggle)** | Plasma-infused liquid toggle switch with tactile viscous drag and organic snap. | GLSL Plasma, Spring Physics |

---

## 🔬 Optical Physics & Mathematical Architecture

The suite implements real-world optical phenomena to deliver sovereign visual authenticity:

### 1. Snell's Law of Refraction
$$\frac{\sin \theta_1}{\sin \theta_2} = \frac{n_2}{n_1}$$
Light passing through the curved meniscus bends dynamically based on the calculated normal vectors of the glass surface.

### 2. Chromatic Dispersion (Cauchy's Equation)
$$n(\lambda) = B + \frac{C}{\lambda^2}$$
Refracted rays are decomposed into distinct wavelengths (Red, Green, Blue) to produce natural prismatic rainbow fringe caustics along steep edges.

### 3. Surface Normal Generation
Continuous analytical gradients compute surface slope normals directly on the GPU, avoiding pre-baked normal maps and enabling infinite resolution.

### 4. Damped Spring Kinematics
$$F = -k \cdot x - c \cdot v$$
Tactile interactions adhere to second-order differential motion equations for natural rebound, squish, and settle effects.

---

## 🚀 Getting Started

No heavy bundler or framework required. Every component can run standalone with any static server:

```bash
# 1. Clone the repository
git clone https://github.com/pradeep8190/liquid-glass.git

# 2. Navigate to any component folder
cd liquid-glass/ruler

# 3. Open index.html directly or serve locally
npx serve .
```

---

## 🛠️ Tech Stack

- **Graphics Core**: Raw WebGL / WebGL2
- **Shading Language**: OpenGL Shading Language (GLSL ES 3.0 / 1.0)
- **Kinematics Engine**: Custom RK4 / Semi-implicit Euler spring integrators
- **Styling**: Vanilla CSS3 (backdrop-filter, clamp, CSS variables)

---

## 👤 Author

**Pradeep**
- GitHub: [@pradeep8190](https://github.com/pradeep8190)