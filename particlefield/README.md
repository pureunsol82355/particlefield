# Particle Field with HTML-in-Canvas

A Next.js application featuring an interactive 3D particle field with HTML content rendered directly onto 3D surfaces using vanilla Three.js and the `three-html-render` polyfill.

## 🎯 Project Overview

This project demonstrates:
- **5000-particle interactive field** with color gradients and dynamic animations
- **HTML-in-Canvas rendering** - Real HTML elements (buttons, inputs, etc.) rendered on 3D planes
- **Vanilla Three.js implementation** (not React Three Fiber)
- **Advanced postprocessing** with bloom effects using pmndrs/postprocessing
- **OrbitControls** for camera manipulation
- **Volumetric fog** for atmospheric depth
- **Next.js 16** with Turbopack for fast development

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **pnpm** 10.28.0+ (required - do not use npm or yarn)

### Installation

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install dependencies
pnpm install
```

### Development

```bash
# Start the development server with Turbopack
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

The page auto-updates as you edit files thanks to Turbopack's hot reload.

## 📁 Project Structure

```
my-app/
├── app/
│   ├── ParticleFieldVanilla.tsx  # Main Three.js implementation
│   ├── page.tsx                   # Entry point
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── .github/
│   └── copilot-instructions.md    # Agent rules for AI assistants
├── package.json                   # Dependencies (managed with pnpm)
└── README.md                      # This file
```

## 🛠️ Key Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.1 | React framework with App Router |
| React | 19.2.4 | Component wrapper only |
| Three.js | 0.183.2 | 3D graphics (vanilla, not R3F) |
| three-html-render | 0.1.2 | HTML-in-canvas polyfill |
| postprocessing | Latest | Bloom and visual effects |
| TypeScript | Latest | Type safety |
| Turbopack | Built-in | Fast development builds |

## 🎨 Features

### Interactive Particle Field
- 5000 particles using `BufferGeometry`
- **Color gradient system** - Cyan to magenta/purple gradient across particles
- **Dynamic color pulsing** - Particles glow brighter on mouse interaction
- **Spiral rotation motion** - Particles slowly rotate around the center
- **Wave animations** - Combined Y and Z-axis wave motion for depth
- Mouse interaction with force-based attraction
- Volumetric fog for atmospheric depth
- Smooth animations at 60fps

### Advanced Visual Effects
- **Bloom postprocessing** using pmndrs/postprocessing
- Custom bloom settings: intensity 2.0, low luminance threshold
- Enhanced fog density for atmospheric effect
- Additive blending for glowing particles

### HTML-in-Canvas
- Real HTML elements rendered on 3D surfaces
- Interactive buttons and text inputs that work correctly
- Proper mouse event handling
- OrbitControls disabled when hovering over HTML elements

### Camera Controls
- OrbitControls for intuitive camera manipulation
- Zoom limits: min 2, max 20
- Damping for smooth movement
- Auto-disabled when interacting with HTML elements

## 🔧 Development Guidelines

### Important Constraints

1. **Always use vanilla Three.js** - React Three Fiber conflicts with the html-in-canvas polyfill
2. **Plane-to-HTML ratio is critical** - Use 2x2 plane for 400x400 HTML element
3. **Canvas must have `layoutsubtree` attribute** - Required for polyfill
4. **Set `UNPACK_FLIP_Y_WEBGL` to true** - Ensures correct texture orientation
5. **HTML elements go inside canvas** - Not in the document body

### Adding New HTML Content

```typescript
// Create HTML element
const htmlDiv = document.createElement('div');
htmlDiv.style.cssText = `
  width: 400px;
  height: 400px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
`;

// Append inside canvas (CRITICAL!)
renderer.domElement.appendChild(htmlDiv);

// Create matching plane geometry (2x2 for 400x400 HTML)
const planeGeometry = new THREE.PlaneGeometry(2, 2);

// Register with renderer
htmlRenderer.addObject(htmlDiv, planeMesh);
```

### Animation Loop Order

```typescript
const animate = () => {
  requestAnimationFrame(animate);
  
  controls.update();        // 1. Update controls
  // ... update particles   // 2. Update scene objects
  htmlRenderer.update();    // 3. Update HTML renderer
  composer.render();        // 4. Render with postprocessing
};
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Texture clipping on edges | Check plane-to-HTML ratio (should be 2x2 for 400x400) |
| Texture upside down | Ensure `gl.UNPACK_FLIP_Y_WEBGL = true` |
| HTML clicks not working | Disable OrbitControls on pointerenter/leave |
| SSR errors | Use dynamic imports with `ssr: false` |
| Build errors with BufferAttribute | Use `.setAttribute()`, not JSX syntax |

## 📦 Dependencies Management

**Always use pnpm:**

```bash
# Add a package
pnpm add package-name

# Add a dev dependency
pnpm add -D package-name

# Remove a package
pnpm remove package-name

# Update dependencies
pnpm update
```

## 🧪 Testing Changes

1. Start dev server: `pnpm dev`
2. Check browser console for errors
3. Test particle animation smoothness
4. Verify HTML interactions (clicks, inputs)
5. Test OrbitControls (zoom, pan, rotate)
6. Check that HTML elements appear correctly on the plane

## 📚 Learn More

### Three.js Resources
- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [OrbitControls Documentation](https://threejs.org/docs/#examples/en/controls/OrbitControls)

### HTML-in-Canvas Polyfill
- [three-html-render GitHub](https://github.com/repalash/three-html-render)
- [WICG HTML-in-Canvas Proposal](https://github.com/WICG/html-in-canvas)

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)

## 🤖 AI Assistant Guidelines

This repository includes agent rules in `.github/copilot-instructions.md` for AI assistants like GitHub Copilot. These rules ensure:
- Correct use of vanilla Three.js (not R3F)
- Proper html-in-canvas polyfill setup
- Correct plane-to-HTML size ratios
- Best practices for Three.js in Next.js

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill the process on port 3000 (Windows)
taskkill /F /IM node.exe

# Then restart
pnpm dev
```

### TypeScript Errors
- Ensure all Three.js objects have explicit types
- Use `THREE.Scene`, `THREE.Mesh`, etc., not generic types

### Performance Issues
- Check particle count (default: 5000)
- Verify animation loop is not creating memory leaks
- Ensure proper cleanup in useEffect return function

## 📝 License

This project is for development and educational purposes.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- 3D graphics powered by [Three.js](https://threejs.org)
- HTML-in-canvas via [three-html-render](https://github.com/repalash/three-html-render)

