'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

    const mouse = { x: 0, y: 0 };

    async function init() {
      // Import html-in-canvas modules
      const [{ installHtmlInCanvasPolyfill }, { ThreeHTMLRenderer }] = await Promise.all([
        import('three-html-render/polyfill'),
        import('three-html-render/renderer')
      ]);

      // Install polyfill
      installHtmlInCanvasPolyfill();

      // Create scene
      scene = new THREE.Scene();
      
      // CSS 배경이 보이도록 씬의 배경을 설정하지 않습니다.

      // Create camera
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 5;

      // Create WebGL renderer (alpha 트루를 주어 배경을 투명하게 만듦)
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0); // 캔버스 투명도 100%
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // CRITICAL: Add layoutsubtree attribute BEFORE appending
      renderer.domElement.setAttribute('layoutsubtree', '');
      
      // Set FLIP_Y for HTML textures
      const gl = renderer.getContext() as WebGLRenderingContext;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      
      containerRef.current!.appendChild(renderer.domElement);

      // Create HTML renderer and connect AFTER canvas is in DOM
      htmlRenderer = new ThreeHTMLRenderer();
      htmlRenderer.connect(renderer.domElement, camera, renderer);
      
      console.log('HTML Renderer connected, canvas has layoutsubtree:', 
        renderer.domElement.hasAttribute('layoutsubtree'));

      // Create HTML element - match the examples (no box-sizing!)
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
        <h2 style="margin: 0 0 8px 0; color: #4488ff; font-size: 16px;">HTML in Canvas! 🎉</h2>
        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.3;">This HTML is rendered on canvas.</p>
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
        <input type="text" placeholder="Type something..." style="
          width: 100%;
          padding: 8px;
          border: 1px solid #4488ff;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 13px;
          box-sizing: border-box;
          margin-bottom: 12px;
        ">
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
        ">🔗 프레젠테이션 보기</a>
      `;
      
      // CRITICAL: Add HTML element INSIDE the canvas, not to body
      renderer.domElement.appendChild(htmlDiv);
      
      // Set explicit dimensions in JavaScript (like the official example does)
      htmlDiv.style.width = '400px';
      htmlDiv.style.height = '400px';

      // Add button click handler
      let clickCount = 0;
      const button = htmlDiv.querySelector('#htmlButton') as HTMLButtonElement;
      button.addEventListener('click', () => {
        clickCount++;
        button.textContent = `Click Counter: ${clickCount}`;
      });

      // Create group and add HTML plane
      group = new THREE.Group();
      
      // Create plane geometry - match the example ratio
      // HTML element is 400x400, use a 2x2 plane like the example
      const planeGeometry = new THREE.PlaneGeometry(2, 2);
      
      // Explicitly set bounding box to match plane size
      planeGeometry.boundingBox = new THREE.Box3(
        new THREE.Vector3(-1, -1, 0),
        new THREE.Vector3(1, 1, 0)
      );
      
      // Create a basic material - the polyfill will replace it with the HTML texture
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      
      group.add(plane);
      group.position.set(0, 0, 0); // Centered at origin
      scene.add(group);
      
      console.log('Group position:', group.position);
      console.log('Plane position:', plane.position);
      console.log('Camera position:', camera.position);
      
      // CRITICAL: Register the HTML element with the mesh using ThreeHTMLRenderer
      htmlRenderer.addObject(htmlDiv, plane);
      
      console.log('Plane mesh created:');
      console.log('  - HTML element registered with renderer');
      console.log('  - Element dimensions:', htmlDiv.offsetWidth, 'x', htmlDiv.offsetHeight);
      console.log('  - Plane geometry size:', planeGeometry.parameters.width, 'x', planeGeometry.parameters.height);
      console.log('  - Canvas size:', renderer.domElement.width, 'x', renderer.domElement.height);
      console.log('  - Canvas client size:', renderer.domElement.clientWidth, 'x', renderer.domElement.clientHeight);
      console.log('  - Window size:', window.innerWidth, 'x', window.innerHeight);
      console.log('  - Pixel ratio:', window.devicePixelRatio);
      console.log('  - Material type:', planeMaterial.type);



      // Add OrbitControls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 2;
      controls.maxDistance = 20;
      
      // Setup postprocessing with enhanced bloom
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      
      const bloomEffect = new BloomEffect({
        intensity: 2.0,
        luminanceThreshold: 0.15,
        luminanceSmoothing: 0.9,
      });
      composer.addPass(new EffectPass(camera, bloomEffect));
      
      // Disable controls when interacting with HTML elements
      htmlDiv.addEventListener('pointerenter', () => {
        controls.enabled = false;
      });
      htmlDiv.addEventListener('pointerleave', () => {
        controls.enabled = true;
      });

      // Mouse move handler
      const handleMouseMove = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      };
      window.addEventListener('mousemove', handleMouseMove);

      // Handle window resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        
        // Update HTML overlay renderer on resize
        if (htmlRenderer && htmlRenderer.overlayRenderer) {
          htmlRenderer.overlayRenderer.update();
        }
      };
      window.addEventListener('resize', handleResize);

      // Animation loop
      function animate() {
        animationFrameId = requestAnimationFrame(animate);
        
        // 물방울 무늬(Polka Dot)를 흔들리게(Jiggle) 하는 효과 추가
        if (containerRef.current) {
          const time = Date.now() * 0.005; // 속도 조절
          const jiggleX = Math.sin(time) * 5; // X축 흔들림 폭
          const jiggleY = Math.cos(time * 0.8) * 5; // Y축 흔들림 폭
          // 첫 번째 배경(물방울 패턴)의 위치만 변경하고, 초콜릿 이미지는 center를 유지
          containerRef.current.style.backgroundPosition = `${jiggleX}px ${jiggleY}px, center`;
        }

        // Update controls
        controls.update();

        // Update HTML renderer - pass the scene so it can find meshes with .element
        if (htmlRenderer) {
          try {
            htmlRenderer.update(scene);
          } catch (e: any) {
            // Log errors to see what's happening
            if (e.message && !e.message.includes('no snapshot')) {
              console.error('HTML renderer error:', e.message);
            }
          }
        }

        // Render scene with postprocessing
        composer.render();
      }

      animate();

      // Store cleanup function
      cleanupRef.current = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        
        if (controls) {
          controls.dispose();
        }
        
        if (composer) {
          composer.dispose();
        }
        
        if (htmlRenderer) {
          htmlRenderer.disconnect();
        }
        
        if (htmlDiv && htmlDiv.parentNode) {
          htmlDiv.parentNode.removeChild(htmlDiv);
        }
        
        if (renderer) {
          renderer.dispose();
          containerRef.current?.removeChild(renderer.domElement);
        }
        
        // 배경 텍스처 메모리 해제
        if (scene && scene.background instanceof THREE.Texture) {
          scene.background.dispose();
        }
        
        if (group) {
          scene.remove(group);
        }
      };
    }

    init().catch(console.error);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        // 물방울 무늬와 초콜릿 이미지를 겹쳐서 표시
        backgroundImage: 'radial-gradient(circle at 32px 32px, #ffbb00 10px, transparent 11px), url("/chocolate.jpg")',
        backgroundSize: '64px 64px, cover',
        backgroundPosition: '0 0, center',
        backgroundColor: '#4a3018', // 이미지가 없을 때의 기본 갈색 배경
      }}
    />
  );
}
