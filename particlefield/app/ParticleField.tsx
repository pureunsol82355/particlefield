'use client'

import { useRef, useMemo, useEffect } from 'react'
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
      // Create a volumetric distribution
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
    
    // Mouse attraction force
    const mouseX = mousePosition.current.x * viewport.width / 2
    const mouseY = mousePosition.current.y * viewport.height / 2
    
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3
      
      // Get original position for wave motion
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]
      
      // Calculate distance to mouse (projected at z=0)
      const dx = x - mouseX
      const dy = y - mouseY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Attraction/repulsion effect
      const force = Math.max(0, 1 - distance / 10)
      const angle = Math.atan2(dy, dx)
      
      // Wave motion
      const waveX = Math.sin(time * 0.5 + y * 0.1) * 0.3
      const waveY = Math.cos(time * 0.3 + x * 0.1) * 0.3
      const waveZ = Math.sin(time * 0.4 + x * 0.05 + y * 0.05) * 0.5
      
      // Apply mouse interaction
      positions[i3] = x + waveX + Math.cos(angle) * force * 2
      positions[i3 + 1] = y + waveY + Math.sin(angle) * force * 2
      positions[i3 + 2] = z + waveZ
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true
    
    // Rotate the entire system slowly
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

function Scene() {
  return (
    <>
      <color attach="background" args={['#000814']} />
      <Fog />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4fd1ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff006e" />
      <Particles />
    </>
  )
}

export default function ParticleField() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
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
    </div>
  )
}
