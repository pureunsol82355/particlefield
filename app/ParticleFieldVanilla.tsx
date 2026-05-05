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
    let group: THREE.Group;
    let controls: OrbitControls;
    let composer: EffectComposer;
    let glbRoot: THREE.Object3D | null = null;

    // 오디오 관련 변수
    let listener: THREE.AudioListener;
    let sound: THREE.Audio;

    async function init() {
      const [{ installHtmlInCanvasPolyfill }, { ThreeHTMLRenderer }] = await Promise.all([
        import('three-html-render/polyfill'),
        import('three-html-render/renderer')
      ]);

      installHtmlInCanvasPolyfill();
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      // --- 오디오 설정 ---
      listener = new THREE.AudioListener();
      camera.add(listener);
      sound = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();
      // public/bgm.mp3 파일이 있어야 합니다.
      audioLoader.load('/bgm.mp3', (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
      });

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.domElement.setAttribute('layoutsubtree', '');

      const gl = renderer.getContext() as WebGLRenderingContext;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      containerRef.current!.appendChild(renderer.domElement);

      htmlRenderer = new ThreeHTMLRenderer();
      htmlRenderer.connect(renderer.domElement, camera, renderer);

      // --- 1. 메인 UI 박스 생성 ---
      const htmlDiv = document.createElement('div');
      htmlDiv.style.cssText = `
        width: 400px; padding: 15px; background: rgba(0, 0, 0, 0.9);
        color: white; font-family: system-ui; border-radius: 10px;
      `;
      htmlDiv.innerHTML = `
        <h1 style="margin:0 0 10px 0; font-size:20px; color:#ffd500;">
          Chocolate Time Square
        </h1>
        <button id="htmlButton" style="background:#4488ff; border:none; color:white; padding:8px; width:100%; border-radius:5px; cursor:pointer; margin-bottom:8px;">
          Click Counter: 0
        </button>
        <a href="https://docs.google.com/presentation/d/1iP79ODqjkUfsDrvgMkr0NE0FsPAJYypren1u36DEMYU/edit" target="_blank" style="display:block; text-align:center; color:#ffbb00; text-decoration:none; padding:8px; border:1px solid #ffbb00; border-radius:5px; margin-bottom:8px;">🔗 Presentation</a>
        <a href="https://drive.google.com/file/d/1NnMRllVQwBFlKyN09gllSVtle9yk07d9/view" target="_blank" style="display:block; text-align:center; color:white; text-decoration:none; padding:8px; border:1px solid white; border-radius:5px; margin-bottom:8px;">🎬 Final Video</a>
        <button id="contentButton" style="background:#ff4488; border:none; color:white; padding:8px; width:100%; border-radius:5px; cursor:pointer;">
          Content
        </button>
      `;
      renderer.domElement.appendChild(htmlDiv);

      // --- 2. 설명(Description) 팝업 박스 생성 ---
      const descDiv = document.createElement('div');
      descDiv.style.cssText = `
        width: 350px; padding: 20px; background: rgba(45, 25, 10, 0.95);
        color: white; font-family: system-ui; border: 2px solid #ffd500;
        border-radius: 15px; display: none; /* 초기 상태 숨김 */
      `;
      descDiv.innerHTML = `
        <h2 style="color:#ffd500; margin-top:0;">Project Details</h2>
        <p><strong>1. Motivation / Concept:</strong><br/>Chocolate Times Square</p>
        <p><strong>2. Instructions:</strong><br/>With the mouse position and music tempo, you can find Wonka's Face.</p>
        <button id="closeDesc" style="background:#ffd500; border:none; padding:8px; width:100%; cursor:pointer; font-weight:bold; border-radius:5px;">Close</button>
      `;
      renderer.domElement.appendChild(descDiv);

      // --- 3. Three.js 메쉬 설정 (UV 뒤집기 포함) ---
      const createFlippedPlane = (w: number, h: number) => {
        const geo = new THREE.PlaneGeometry(w, h);
        const uvs = geo.attributes.uv;
        for (let i = 0; i < uvs.count; i++) uvs.setY(i, 1 - uvs.getY(i));
        uvs.needsUpdate = true;
        return geo;
      };

      // 메인 박스 메쉬
      const mainMesh = new THREE.Mesh(createFlippedPlane(2, 2.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      scene.add(mainMesh);
      htmlRenderer.addObject(htmlDiv, mainMesh);

      // 설명 박스 메쉬 (메인 박스보다 살짝 앞에 배치)
      const descMesh = new THREE.Mesh(createFlippedPlane(1.8, 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      descMesh.position.set(0, 0, 0.2); 
      descMesh.visible = false;
      scene.add(descMesh);
      htmlRenderer.addObject(descDiv, descMesh);

      // --- 4. 이벤트 리스너 설정 ---
      let clickCount = 0;
      htmlDiv.querySelector('#htmlButton')?.addEventListener('click', () => {
        clickCount++;
        (htmlDiv.querySelector('#htmlButton') as HTMLElement).textContent = `Click Counter: ${clickCount}`;
        if (sound && !sound.isPlaying) sound.play(); // 첫 클릭 시 음악 재생
      });

      htmlDiv.querySelector('#contentButton')?.addEventListener('click', () => {
        descDiv.style.display = 'block';
        descMesh.visible = true;
      });

      descDiv.querySelector('#closeDesc')?.addEventListener('click', () => {
        descDiv.style.display = 'none';
        descMesh.visible = false;
      });

      // --- 기존 GLB 및 컨트롤 로직 ---
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const gltfLoader = new GLTFLoader();
      gltfLoader.load('/chocolate.glb', (gltf) => {
        glbRoot = gltf.scene;
        glbRoot.position.set(2.2, -1.0, -1.8);
        scene.add(glbRoot);
      });

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 1.5, luminanceThreshold: 0.2 })));

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      function animate() {
        animationFrameId = requestAnimationFrame(animate);
        if (containerRef.current) {
          const t = Date.now() * 0.005;
          containerRef.current.style.backgroundPosition = `${Math.sin(t)*5}px ${Math.cos(t)*5}px, center`;
        }
        if (glbRoot) {
          const t = performance.now() * 0.001;
          glbRoot.rotation.y = t * 0.35;
          glbRoot.position.y = -1.0 + Math.sin(t * 1.3) * 0.35;
        }
        controls.update();
        if (htmlRenderer) htmlRenderer.update(scene);
        composer.render();
      }
      animate();

      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        if (sound && sound.isPlaying) sound.stop();
        renderer.dispose();
      };
    }

    init().catch(console.error);
    return () => cleanupRef.current?.();
  }, []);

  return (
    <>
      <div style={{ position: 'fixed', top: 18, width: '100%', zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 64px)', color: '#ffd500', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
          Chocolate Times Square
        </div>
      </div>
      <div ref={containerRef} style={{
        width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0,
        backgroundImage: 'radial-gradient(circle at 32px 32px, #ffbb00 10px, transparent 11px), url("/chocolate.jpg")',
        backgroundSize: '64px 64px, cover', backgroundPosition: '0 0, center', backgroundColor: '#4a3018',
      }} />
    </>
  );
}
