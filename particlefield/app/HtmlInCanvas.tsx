'use client'

import { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Dynamically import to avoid SSR issues
let ThreeHTMLRenderer: any = null
let installHtmlInCanvasPolyfill: any = null

if (typeof window !== 'undefined') {
  import('three-html-render/renderer').then((mod) => {
    ThreeHTMLRenderer = mod.ThreeHTMLRenderer
  })
  import('three-html-render/polyfill').then((mod) => {
    installHtmlInCanvasPolyfill = mod.installHtmlInCanvasPolyfill
  })
}

interface HtmlInCanvasProps {
  htmlElementId: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  width?: number
  height?: number
}

export function HtmlInCanvas({ 
  htmlElementId, 
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  width = 2,
  height = 2
}: HtmlInCanvasProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const htmlRendererRef = useRef<any>(null)
  const { gl, camera } = useThree()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true
    let paintRequested = false

    const initializeRenderer = async () => {
      // Load modules
      if (!ThreeHTMLRenderer || !installHtmlInCanvasPolyfill) {
        const [rendererMod, polyfillMod] = await Promise.all([
          import('three-html-render/renderer'),
          import('three-html-render/polyfill')
        ])
        ThreeHTMLRenderer = rendererMod.ThreeHTMLRenderer
        installHtmlInCanvasPolyfill = polyfillMod.installHtmlInCanvasPolyfill
      }

      if (!mounted) return

      // Install polyfill
      installHtmlInCanvasPolyfill()

      const canvas = gl.domElement as any
      const htmlElement = document.getElementById(htmlElementId)
      
      if (!htmlElement || !meshRef.current) return

      // Add layoutsubtree attribute
      if (!canvas.hasAttribute('layoutsubtree')) {
        canvas.setAttribute('layoutsubtree', '')
      }

      // Set up onpaint handler to request paint when needed
      canvas.onpaint = () => {
        paintRequested = false
      }

      // Request initial paint
      if (canvas.requestPaint && !paintRequested) {
        paintRequested = true
        canvas.requestPaint()
      }

      // Wait for initial paint cycle
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve)
        })
      })

      if (!mounted) return

      // Create and connect renderer
      const htmlRenderer = new ThreeHTMLRenderer()
      htmlRendererRef.current = htmlRenderer
      
      htmlRenderer.connect(canvas, camera, gl)
      htmlRenderer.addObject(htmlElement, meshRef.current)
      
      setIsReady(true)
    }

    initializeRenderer().catch(console.error)

    return () => {
      mounted = false
      htmlRendererRef.current = null
      setIsReady(false)
    }
  }, [gl, camera, htmlElementId])

  // Update the renderer each frame
  useFrame(() => {
    if (htmlRendererRef.current && isReady) {
      try {
        htmlRendererRef.current.update()
      } catch (error) {
        // Ignore errors - they're expected during initialization
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial transparent opacity={1} />
    </mesh>
  )
}

// Hook version for more control
export function useHtmlInCanvas(htmlElementId: string, mesh: THREE.Mesh | null) {
  const { gl, camera } = useThree()
  const htmlRendererRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !mesh) return

    let mounted = true
    let paintRequested = false

    const initializeRenderer = async () => {
      if (!ThreeHTMLRenderer || !installHtmlInCanvasPolyfill) {
        const [rendererMod, polyfillMod] = await Promise.all([
          import('three-html-render/renderer'),
          import('three-html-render/polyfill')
        ])
        ThreeHTMLRenderer = rendererMod.ThreeHTMLRenderer
        installHtmlInCanvasPolyfill = polyfillMod.installHtmlInCanvasPolyfill
      }

      if (!mounted) return

      installHtmlInCanvasPolyfill()

      const canvas = gl.domElement as any
      const htmlElement = document.getElementById(htmlElementId)
      if (!htmlElement) return

      if (!canvas.hasAttribute('layoutsubtree')) {
        canvas.setAttribute('layoutsubtree', '')
      }

      canvas.onpaint = () => {
        paintRequested = false
      }

      if (canvas.requestPaint && !paintRequested) {
        paintRequested = true
        canvas.requestPaint()
      }

      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve)
        })
      })

      if (!mounted) return

      const htmlRenderer = new ThreeHTMLRenderer()
      htmlRendererRef.current = htmlRenderer
      
      htmlRenderer.connect(canvas, camera, gl)
      htmlRenderer.addObject(htmlElement, mesh)
      
      setIsReady(true)
    }

    initializeRenderer().catch(console.error)

    return () => {
      mounted = false
      htmlRendererRef.current = null
      setIsReady(false)
    }
  }, [gl, camera, htmlElementId, mesh])

  const update = () => {
    if (htmlRendererRef.current && isReady) {
      try {
        htmlRendererRef.current.update()
      } catch (error) {
        // Ignore initialization errors
      }
    }
  }

  return { htmlRenderer: htmlRendererRef.current, update, isReady }
}
