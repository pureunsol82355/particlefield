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
    let controls: OrbitControls;
    let composer: EffectComposer;
    let glbRoot: THREE.Object3D | null = null;
    let sound: THREE.Audio;

    async function init() {
      // 라이브러리 동적 임포트
      const [{ installHtmlInCanvasPolyfill }, { ThreeHTMLRenderer }] = await Promise.all([
        import('three-html-render/polyfill'),
        import('three-html-render/renderer')
      ]);

      installHtmlInCanvasPolyfill();
      scene = new THREE.Scene();

      // 카메라 설정
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      // 오디오 설정
      const listener = new THREE.AudioListener();
      camera.add(listener);
      sound = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load('/bgm.mp3', (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
      });

      // 렌더러 설정
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.domElement.setAttribute('layoutsubtree', '');
      
      const gl = renderer.getContext() as WebGLRenderingContext;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      containerRef.current!.appendChild(renderer.domElement);

      // HTML 렌더러 초기화 및 연결
      htmlRenderer = new ThreeHTMLRenderer();
      htmlRenderer.connect(renderer.domElement, camera, renderer);

      // --- 1. 메인 UI 박스 (Main Box) ---
      const htmlDiv = document.createElement('div');
      htmlDiv.style.cssText = `
        width: 400px; padding: 15px; background: rgba(0, 0, 0, 0.9);
        color: white; font-family: system-ui; border-radius: 10px;
        position: absolute; top: 0; left: 0; pointer-events: auto;
      `;
      htmlDiv.innerHTML = `
        <h1 style="margin:0 0 10px 0; font-size:20px; color:#ffd500;">Chocolate Time Square</h1>
        <button id="htmlButton" style="background:#4488ff; border:none; color:white; padding:10px; width:100%; border-radius:5px; cursor:pointer; margin-bottom:8px;">Click Counter: 0</button>
        <a href="https://docs.google.com/presentation/d/1iP79ODqjkUfsDrvgMkr0NE0FsPAJYypren1u36DEMYU/edit" target="_blank" style="display:block; text-align:center; color:#ffbb00; text-decoration:none; padding:8px; border:1px solid #ffbb00; border-radius:5px; margin-bottom:8px;">🔗 Presentation</a>
        <a href="https://drive.google.com/file/d/1NnMRllVQwBFlKyN09gllSVtle9yk07d9/view" target="_blank" style="display:block; text-align:center; color:white; text-decoration:none; padding:8px; border:1px solid white; border-radius:5px; margin-bottom:8px;">🎬 Final Video</a>
        <button id="contentButton" style="background:#ff4488; border:none; color:white; padding:10px; width:100%; border-radius:5px; cursor:pointer;">Content</button>
      `;
      renderer.domElement.appendChild(htmlDiv);

      // --- 2. 설명 팝업 박스 (Description Box) ---
      const descDiv = document.createElement('div');
      descDiv.style.cssText = `
        width: 350px; padding: 20px; background: rgba(45, 25, 10, 0.95);
        color: white; font-family: system-ui; border: 2px solid #ffd500;
        border-radius: 15px; display: none; position: absolute; top: 0; left: 0;
      `;
      descDiv.innerHTML = `
        <h2 style="color:#ffd500; margin-top:0;">Project Details</h2>
        <p><strong>1. Motivation / Concept:</strong><br/>Chocolate Times Square</p>
        <p><strong>2. Instructions:</strong><br/>With the mouse position and music tempo, you can find Wonka's Face.</p>
        <button id="closeDesc" style="background:#ffd500; border:none; padding:10px; width:100%; cursor:pointer; font-weight:bold; border-radius:5px; color:#000;">Close</button>
      `;
      renderer.domElement.appendChild(descDiv);

      // --- 3. Three.js 메쉬 생성 (UV 반전 적용) ---
      const createPlane = (w: number, h: number) => {
        const geo = new THREE.PlaneGeometry(w, h);
        const uvs = geo.attributes.uv;
        for (let i = 0; i < uvs.count; i++) uvs.setY(i, 1 - uvs.getY(i));
        uvs.needsUpdate = true;
        return geo;
      };

      const mainMesh = new THREE.Mesh(createPlane(2, 2.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      scene.add(mainMesh);
      htmlRenderer.addObject(htmlDiv, mainMesh);

      const descMesh = new THREE.Mesh(createPlane(1.8, 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      descMesh.position.set(0, 0, 0.2); // 메인 박스보다 살짝 앞에 위치
      descMesh.visible = false;
      scene.add(descMesh);
      htmlRenderer.addObject(descDiv, descMesh);

      // --- 4. 이벤트 핸들러 ---
      let clickCount = 0;
      htmlDiv.querySelector('#htmlButton')?.addEventListener('click', () => {
        clickCount++;
        (htmlDiv.querySelector('#htmlButton') as HTMLElement).textContent = `Click Counter: ${clickCount}`;
        if (sound && !sound.isPlaying) sound.play(); 
      });

      htmlDiv.querySelector('#contentButton')?.addEventListener('click', () => {
        descDiv.style.display = 'block';
        descMesh.visible = true;
      });

      descDiv.querySelector('#closeDesc')?.addEventListener('click', () => {
        descDiv.style.display = 'none';
        descMesh.visible = false;
      });

      // 마우스 오버 시 컨트롤 비활성화 (버튼 클릭 방해 방지)
      [htmlDiv, descDiv].forEach(div => {
        div.addEventListener('mouseenter', () => { controls.enabled = false; });
        div.addEventListener('mouseleave', () => { controls.enabled = true; });
      });

      // --- GLTF 모델 로드 ---
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      new GLTFLoader().load('/chocolate.glb', (gltf) => {
        glbRoot = gltf.scene;
        glbRoot.position.set(2.2, -1.0, -1.8);
        scene.add(glbRoot);
      });

      // 후처리 (Bloom)
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 1.5, luminanceThreshold: 0.1 })));

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

        // 배경 애니메이션
        if (containerRef.current) {
          const t = Date.now() * 0.005;
          containerRef.current.style.backgroundPosition = `${Math.sin(t)*5}px ${Math.cos(t)*5}px, center`;
        }

        // 모델 애니메이션
        if (glbRoot) {
          const t = performance.now() * 0.001;
          glbRoot.rotation.y = t * 0.35;
          glbRoot.position.y = -1.0 + Math.sin(t * 1.3) * 0.35;
        }

        controls.update();
        
        // HTML 렌더러 업데이트 (에러 방지용 try-catch)
        if (htmlRenderer) {
          try {
            htmlRenderer.update(scene);
          } catch (e) {
            // 스냅샷 생성 전 에러 무시
          }
        }
        
        composer.render();
      }
      animate();

      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        if (sound?.isPlaying) sound.stop();
        controls?.dispose();
        renderer?.dispose();
        if (htmlDiv.parentNode) htmlDiv.parentNode.removeChild(htmlDiv);
        if (descDiv.parentNode) descDiv.parentNode.removeChild(descDiv);
      };
    }

    init().catch(console.error);
    return () => cleanupRef.current?.();
  }, []);

  return (
    <>
      {/* 고정 타이틀 */}
      <div style={{ position: 'fixed', top: 18, width: '100%', zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: 'clamp(24px, 5vw, 64px)', color: '#ffd500', textShadow: '0 2px 12px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          Chocolate Times Square
        </div>
      </div>

      {/* 배경 컨테이너 */}
      <div ref={containerRef} style={{
        width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0,
        backgroundImage: 'radial-gradient(circle at 32px 32px, #ffbb00 10px, transparent 11px), url("/chocolate.jpg")',
        backgroundSize: '64px 64px, cover', backgroundPosition: '0 0, center', backgroundColor: '#4a3018',
      }} />
    </>
  );
}
