'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';

export default function ParticleFieldVanilla() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let animationFrameId: number;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let htmlRenderer: any;
    let htmlDiv: HTMLDivElement;
    let group: THREE.Group;
    let controls: OrbitControls;
    let composer: EffectComposer;
    let glbRoot: THREE.Object3D | null = null;

    const mouse = { x: 0, y: 0 };

    async function init() {
      const [{ installHtmlInCanvasPolyfill }, { ThreeHTMLRenderer }] = await Promise.all([
        import('three-html-render/polyfill'),
        import('three-html-render/renderer')
      ]);

      installHtmlInCanvasPolyfill();

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0); 
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      renderer.domElement.setAttribute('layoutsubtree', '');

      const gl = renderer.getContext() as WebGLRenderingContext;
      // Note: We keep this, but the UV flip below ensures the "reading direction" matches the interaction
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

      containerRef.current!.appendChild(renderer.domElement);

      htmlRenderer = new ThreeHTMLRenderer();
      htmlRenderer.connect(renderer.domElement, camera, renderer);

      // --- HTML UI Setup ---
      htmlDiv = document.createElement('div');
      htmlDiv.style.cssText = `
        width: 400px;
        height: 400px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        font-family: system-ui;
        overflow: visible;
      `;
      htmlDiv.innerHTML = `
        <h1 style="margin:0 0 10px 0; font-size:20px; font-weight:700; color:#ffd500; line-height:1.2;">
          Chocolate Time Square<br/>
          My dream with Chocolate:)<br/>
          Click the link !
        </h1>
        <button id="htmlButton" style="
          background: #4488ff;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
          display: block;
          width: 100%;
          margin-bottom: 8px;
        ">Click Counter: 0</button>
        <a href="https://docs.google.com/presentation/d/1iP79ODqjkUfsDrvgMkr0NE0FsPAJYypren1u36DEMYU/edit?usp=sharing" target="_blank" style="
          display: block;
          text-align: center;
          color: #ffbb00;
          text-decoration: none;
          font-size: 14px;
          padding: 8px;
          border: 1px solid #ffbb00;
          border-radius: 5px;
          transition: 0.2s;
          margin-bottom: 8px;
        ">🔗 Presentation</a>
        <a href="https://drive.google.com/file/d/1NnMRllVQwBFlKyN09gllSVtle9yk07d9/view?usp=sharing" target="_blank" style="
          display: block;
          text-align: center;
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          padding: 8px;
          border: 1px solid #ffffff;
          border-radius: 5px;
          transition: 0.2s;
        ">🎬 Final Video</a>
      `;

      renderer.domElement.appendChild(htmlDiv);
      htmlDiv.style.width = '400px';
      htmlDiv.style.height = '400px';

      let clickCount = 0;
      const button = htmlDiv.querySelector('#htmlButton') as HTMLButtonElement;
      button.addEventListener('click', () => {
        clickCount++;
        button.textContent = `Click Counter: ${clickCount}`;
      });

      group = new THREE.Group();

      // --- CRITICAL FIX: FLIP UV COORDINATES ---
      const planeGeometry = new THREE.PlaneGeometry(2, 2);
      const uvAttribute = planeGeometry.attributes.uv;
      for (let i = 0; i < uvAttribute.count; i++) {
          let v = uvAttribute.getY(i);
          uvAttribute.setY(i, 1 - v); // Flip the texture mapping vertically
      }
      uvAttribute.needsUpdate = true;
      // -----------------------------------------

      planeGeometry.boundingBox = new THREE.Box3(
        new THREE.Vector3(-1, -1, 0),
        new THREE.Vector3(1, 1, 0)
      );

      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);

      group.add(plane);
      scene.add(group);

      htmlRenderer.addObject(htmlDiv, plane);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      const gltfLoader = new GLTFLoader();
      gltfLoader.load('/chocolate.glb', (gltf) => {
        glbRoot = gltf.scene;
        glbRoot.position.set(2.2, -1.0, -1.8);
        scene.add(glbRoot);
      });

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomEffect = new BloomEffect({
        intensity: 2.0,
        luminanceThreshold: 0.15,
        luminanceSmoothing: 0.9,
      });
      composer.addPass(new EffectPass(camera, bloomEffect));

      htmlDiv.addEventListener('pointerenter', () => { controls.enabled = false; });
      htmlDiv.addEventListener('pointerleave', () => { controls.enabled = true; });

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        if (htmlRenderer?.overlayRenderer) htmlRenderer.overlayRenderer.update();
      };
      window.addEventListener('resize', handleResize);

      function animate() {
        animationFrameId = requestAnimationFrame(animate);

        if (containerRef.current) {
          const time = Date.now() * 0.005;
          const jiggleX = Math.sin(time) * 5;
          const jiggleY = Math.cos(time * 0.8) * 5;
          containerRef.current.style.backgroundPosition = `${jiggleX}px ${jiggleY}px, center`;
        }

        if (glbRoot) {
          const t = performance.now() * 0.001;
          glbRoot.rotation.y = t * 0.35;
          glbRoot.position.x = 2.2 + Math.cos(t * 0.45) * 1.8;
          glbRoot.position.z = -1.8 + Math.sin(t * 0.45) * 1.2;
          glbRoot.position.y = -1.0 + Math.sin(t * 1.3) * 0.35;
        }

        controls.update();
        if (htmlRenderer) {
          try { htmlRenderer.update(scene); } catch (e) {}
        }
        composer.render();
      }

      animate();

      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        controls?.dispose();
        composer?.dispose();
        htmlRenderer?.disconnect();
        if (htmlDiv?.parentNode) htmlDiv.parentNode.removeChild(htmlDiv);
        renderer?.dispose();
      };
    }

    init().catch(console.error);
    return () => cleanupRef.current?.();
  }, []);

  return (
    <>
      <div style={{
          position: 'fixed', top: 18, left: 0, width: '100%', zIndex: 50,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
        <div style={{
            fontFamily: 'system-ui', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 64px)',
            color: '#ffd500', textShadow: '0 2px 12px rgba(0,0,0,0.55)', textAlign: 'center',
          }}>
          Chocolate Times Square
        </div>
      </div>

      <div ref={containerRef} style={{
          width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0,
          backgroundImage: 'radial-gradient(circle at 32px 32px, #ffbb00 10px, transparent 11px), url("/chocolate.jpg")',
          backgroundSize: '64px 64px, cover', backgroundPosition: '0 0, center', backgroundColor: '#4a3018',
        }}
      />
    </>
  );
}
