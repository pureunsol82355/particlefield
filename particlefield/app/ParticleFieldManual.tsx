'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'

function Particles() {
  const particlesRef = useRef<THREE.Points>(null!)
  const mousePosition = useRef({ x: 0, y: 0 })
  const { viewport } = useThree()

  const particlesCount = 5000
  
  const [positions, scales] = useMemo(() => {
    const positions = new Float32Array(particlesCount * 3)
    const scales = new Float32Array(particlesCount)
    
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 40
      positions[i3 + 1] = (Math.random() - 0.5) * 40
      positions[i3 + 2] = (Math.random() - 0.5) * 40
      
      scales[i] = Math.random() * 0.5 + 0.2
    }
    
    return [positions, scales]
  }, [particlesCount])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useFrame((state) => {
    if (!particlesRef.current) return
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
    const time = state.clock.elapsedTime
    
    const mouseX = mousePosition.current.x * viewport.width / 2
    const mouseY = mousePosition.current.y * viewport.height / 2
    
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3
      
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]
      
      const dx = x - mouseX
      const dy = y - mouseY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      const force = Math.max(0, 1 - distance / 10)
      const angle = Math.atan2(dy, dx)
      
      const waveX = Math.sin(time * 0.5 + y * 0.1) * 0.3
      const waveY = Math.cos(time * 0.3 + x * 0.1) * 0.3
      const waveZ = Math.sin(time * 0.4 + x * 0.05 + y * 0.05) * 0.5
      
      positions[i3] = x + waveX + Math.cos(angle) * force * 2
      positions[i3 + 1] = y + waveY + Math.sin(angle) * force * 2
      positions[i3 + 2] = z + waveZ
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true
    particlesRef.current.rotation.y = time * 0.05
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    return geo
  }, [positions, scales])

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.15}
        color="#4fd1ff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function Fog() {
  return (
    <fog attach="fog" args={['#000814', 10, 50]} />
  )
}

function HtmlInCanvasPlane() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const { gl, camera, scene } = useThree()
  const [htmlRenderer, setHtmlRenderer] = useState<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const setupHtmlRenderer = async () => {
      // Import the modules
      const [{ installHtmlInCanvasPolyfill }, { ThreeHTMLRenderer }] = await Promise.all([
        import('three-html-render/polyfill'),
        import('three-html-render/renderer')
      ])

      if (!mounted) return

      // Install polyfill
      installHtmlInCanvasPolyfill()

      // Get canvas and add layoutsubtree attribute
      const canvas = gl.domElement as any
      canvas.setAttribute('layoutsubtree', '')

      // Get HTML content
      const htmlContent = document.getElementById('html-content')
      if (!htmlContent || !meshRef.current) return

      // Create HTML renderer
      const renderer = new ThreeHTMLRenderer()
      renderer.connect(canvas, camera, gl)
      renderer.addObject(htmlContent, meshRef.current)

      setHtmlRenderer(renderer)
    }

    setupHtmlRenderer().catch(console.error)

    return () => {
      mounted = false
      setHtmlRenderer(null)
    }
  }, [gl, camera])

  // Manual update in useFrame
  useFrame((state) => {
    if (htmlRenderer) {
      try {
        htmlRenderer.update()
      } catch (e) {
        // Suppress errors
      }
    }

    // Rotate the group
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <planeGeometry args={[4, 3]} />
        <meshBasicMaterial transparent opacity={1} />
      </mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#000814']} />
      <Fog />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4fd1ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff006e" />
      <Particles />
      <HtmlInCanvasPlane />
    </>
  )
}

export default function ParticleFieldManual() {
  const [buttonText, setButtonText] = useState('Click me!')

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene />
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <DepthOfField
            focusDistance={0.02}
            focalLength={0.05}
            bokehScale={3}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.9} />
          <Noise opacity={0.02} />
        </EffectComposer>
      </Canvas>

      {/* HTML content that will be rendered in canvas */}
      <div
        id="html-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '512px',
          height: '384px',
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(79, 209, 255, 0.9), rgba(255, 0, 110, 0.9))',
          borderRadius: '20px',
          fontFamily: 'Arial, sans-serif',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>
          HTML in Canvas! 🎨
        </h1>
        <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>
          This HTML is rendered as a WebGL texture on the 3D plane.
          True html-in-canvas with manual control!
        </p>
        <button
          onClick={() => {
            setButtonText('Clicked! ✅')
            setTimeout(() => setButtonText('Click me!'), 1000)
          }}
          style={{
            padding: '12px 24px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid white',
            borderRadius: '10px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {buttonText}
        </button>
        <input
          type="text"
          placeholder="Type here..."
          style={{
            padding: '10px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '2px solid white',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            outline: 'none',
          }}
        />
        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '10px' }}>
          Using three-html-render with manual control
        </div>
      </div>
    </div>
  )
}
