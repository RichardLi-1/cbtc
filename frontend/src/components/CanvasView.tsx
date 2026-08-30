import { useEffect, useRef, useCallback, useState } from 'react'
import { useTopologyStore } from '../store/topologyStore'
import { useRuntimeStore } from '../store/runtimeStore'
import { Viewport } from '../render/Viewport'
import { renderTrackLayer } from '../render/layers/TrackLayer'
import { renderSwitchLayer } from '../render/layers/SwitchLayer'
import { renderSignalLayer } from '../render/layers/SignalLayer'
import { renderTrainLayer } from '../render/layers/TrainLayer'
import { renderLabelLayer } from '../render/layers/LabelLayer'
import { COLORS } from '../constants/colors'
import { interpolatePolyline, hitTestPoint } from '../utils/geometry'
import type { HoveredEntity, Topology, RuntimeState, DispatchAction } from '../types/domain'
import { Tooltip } from './Tooltip'

// Shared viewport instance — lives outside React so the rAF loop can close over it
const vp = new Viewport()

function hitTest(
  sx: number, sy: number,
  topology: Topology,
  runtime: RuntimeState,
): HoveredEntity | null {
  // Trains first (largest hit target)
  for (const train of runtime.trains) {
    const edge = topology.edges.find(e => e.id === train.edge_id)
    if (!edge) continue
    const wp = interpolatePolyline(edge.points, train.offset)
    if (hitTestPoint(wp.x, wp.y, sx, sy, (wx, wy) => vp.worldToScreen(wx, wy), 22)) {
      return { kind: 'train', id: train.train_id, screenX: sx, screenY: sy }
    }
  }
  // Signals
  for (const sig of topology.signals) {
    const edge = topology.edges.find(e => e.id === sig.edge_id)
    if (!edge) continue
    const wp = interpolatePolyline(edge.points, sig.offset)
    if (hitTestPoint(wp.x, wp.y, sx, sy, (wx, wy) => vp.worldToScreen(wx, wy), 10)) {
      return { kind: 'signal', id: sig.id, screenX: sx, screenY: sy }
    }
  }
  // Switches
  for (const sw of topology.switches) {
    const node = topology.nodes.find(n => n.id === sw.node_id)
    if (!node) continue
    if (hitTestPoint(node.x, node.y, sx, sy, (wx, wy) => vp.worldToScreen(wx, wy), 12)) {
      return { kind: 'switch', id: sw.id, screenX: sx, screenY: sy }
    }
  }
  return null
}

export function CanvasView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const flashRef = useRef(false)
  const flashTimerRef = useRef(0)

  // Drag state (not in React state — avoids re-renders during pan)
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // Touch state — single-finger pan + two-finger pinch zoom (mobile)
  const lastTouch = useRef({ x: 0, y: 0 })
  const pinchDist = useRef(0)
  const touchMoved = useRef(false)

  const [hovered, setHovered] = useState<HoveredEntity | null>(null)
  const [trainMenu, setTrainMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  const { topology } = useTopologyStore()
  const { setHovered: storeSetHovered, sendSwitchCommand, sendSignalCommand, sendTrainCommand } = useRuntimeStore()

  // Fit viewport when topology first loads
  useEffect(() => {
    if (!topology) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    vp.resize(w, h)
    vp.fitToBounds({
      minX: topology.bounds.min_x,
      minY: topology.bounds.min_y,
      maxX: topology.bounds.max_x,
      maxY: topology.bounds.max_y,
    })
  }, [topology])

  // Canvas resize observer — scale by devicePixelRatio to prevent blur on Retina displays
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      vp.resize(w, h)
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // rAF render loop — reads Zustand stores directly, never triggers React re-renders
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const render = () => {
      const { topology } = useTopologyStore.getState()
      const { runtime, showSafeZones, showLabels } = useRuntimeStore.getState()

      // Flash phase toggles ~2Hz
      flashTimerRef.current += 16
      if (flashTimerRef.current >= 500) {
        flashRef.current = !flashRef.current
        flashTimerRef.current = 0
      }

      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      ctx.fillStyle = COLORS.BACKGROUND
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)

      if (!topology) {
        ctx.fillStyle = COLORS.PANEL_TEXT_DIM
        ctx.font = '13px monospace'
        ctx.fillText('Loading topology…', 20, 40)
        animRef.current = requestAnimationFrame(render)
        return
      }

      renderTrackLayer(ctx, vp, topology)
      // Station platforms render under signals/switches/trains so the icons sit on top.
      renderLabelLayer(ctx, vp, topology, showLabels)
      if (runtime) {
        renderSwitchLayer(ctx, vp, topology, runtime)
        renderSignalLayer(ctx, vp, topology, runtime, flashRef.current)
        renderTrainLayer(ctx, vp, topology, runtime, showSafeZones, showLabels)
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, []) // intentionally empty — loop reads stores directly

  // ── Pointer events ──────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setTrainMenu(null)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) {
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      vp.pan(dx, dy)
      lastMouse.current = { x: e.clientX, y: e.clientY }
      setHovered(null)
    } else {
      // Hover hit-test
      const topo = useTopologyStore.getState().topology
      const rt = useRuntimeStore.getState().runtime
      if (!topo || !rt) return
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const hit = hitTest(sx, sy, topo, rt)
      setHovered(hit)
      storeSetHovered(hit)
    }
  }, [storeSetHovered])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])
  const onMouseLeave = useCallback(() => { dragging.current = false; setHovered(null) }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    vp.zoomAtPoint(factor, sx, sy)
  }, [])

  const onClick = useCallback((e: React.MouseEvent) => {
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 4) return  // was a mouse drag
    if (touchMoved.current) { touchMoved.current = false; return }  // was a touch pan/pinch
    const topo = useTopologyStore.getState().topology
    const rt = useRuntimeStore.getState().runtime
    if (!topo || !rt) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const hit = hitTest(sx, sy, topo, rt)
    if (!hit) { setTrainMenu(null); return }

    if (hit.kind === 'train') {
      setTrainMenu({ id: hit.id, x: sx, y: sy })
    }

    if (hit.kind === 'switch') {
      const current = rt.switches.find(s => s.switch_id === hit.id)?.state ?? 'normal'
      const next = current === 'normal' ? 'reverse' : 'normal'
      if (confirm(`Toggle ${hit.id}: ${current} → ${next}?`)) {
        sendSwitchCommand(hit.id, next)
      }
    }

    if (hit.kind === 'signal') {
      const current = rt.signals.find(s => s.signal_id === hit.id)?.aspect ?? 'green'
      const aspects = ['green', 'yellow', 'red', 'dark'] as const
      const next = aspects[(aspects.indexOf(current as typeof aspects[number]) + 1) % aspects.length]
      sendSignalCommand(hit.id, next)
    }
  }, [sendSwitchCommand, sendSignalCommand])

  // ── Touch events (mobile): 1 finger pans, 2 fingers pinch-zoom ───────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setHovered(null)
    touchMoved.current = false
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDist.current = Math.hypot(dx, dy)
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchMoved.current = true
    if (e.touches.length === 1) {
      const t = e.touches[0]
      vp.pan(t.clientX - lastTouch.current.x, t.clientY - lastTouch.current.y)
      lastTouch.current = { x: t.clientX, y: t.clientY }
    } else if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      if (pinchDist.current > 0) {
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
        const midX = (a.clientX + b.clientX) / 2 - rect.left
        const midY = (a.clientY + b.clientY) / 2 - rect.top
        vp.zoomAtPoint(dist / pinchDist.current, midX, midY)
      }
      pinchDist.current = dist
    }
  }, [])

  const onTouchEnd = useCallback(() => { pinchDist.current = 0 }, [])

  // Double-click: fit to bounds
  const onDoubleClick = useCallback(() => {
    const topo = useTopologyStore.getState().topology
    if (!topo) return
    vp.fitToBounds({
      minX: topo.bounds.min_x,
      minY: topo.bounds.min_y,
      maxX: topo.bounds.max_x,
      maxY: topo.bounds.max_y,
    })
  }, [])

  const { topology: topoForTooltip, } = useTopologyStore()
  const { runtime: rtForTooltip } = useRuntimeStore()

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: dragging.current ? 'grabbing' : 'crosshair' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      />
      {hovered && topoForTooltip && rtForTooltip && (
        <Tooltip hovered={hovered} topology={topoForTooltip} runtime={rtForTooltip} />
      )}
      {trainMenu && (
        <TrainDispatchMenu
          trainId={trainMenu.id}
          x={trainMenu.x}
          y={trainMenu.y}
          onAction={(action, count) => { sendTrainCommand(trainMenu.id, action, count); setTrainMenu(null) }}
          onClose={() => setTrainMenu(null)}
        />
      )}
    </>
  )
}

function TrainDispatchMenu({
  trainId, x, y, onAction, onClose,
}: {
  trainId: string
  x: number
  y: number
  onAction: (action: DispatchAction, count?: number) => void
  onClose: () => void
}) {
  const train = useRuntimeStore((s) => s.runtime?.trains.find((t) => t.train_id === trainId))
  const active = train?.dispatch_hold
    ? 'HOLD at platform'
    : train?.dispatch_express
      ? 'EXPRESS (non-stop)'
      : (train?.dispatch_skip_remaining ?? 0) > 0
        ? `SKIP next ${train?.dispatch_skip_remaining}`
        : 'normal'

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', left: Math.min(x + 12, window.innerWidth - 200), top: y + 12, zIndex: 120,
        background: COLORS.PANEL_BG, border: `1px solid ${COLORS.PANEL_BORDER}`,
        borderRadius: 4, padding: 8, width: 184,
        fontFamily: 'monospace', fontSize: 11, color: COLORS.PANEL_TEXT,
        boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ letterSpacing: '0.08em' }}>DISPATCH · {trainId}</span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: COLORS.PANEL_TEXT_DIM }} title="Close">✕</span>
      </div>
      <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 10, marginBottom: 8 }}>state: {active}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <MenuBtn label="Hold at platform" hint="close the gap behind" onClick={() => onAction('hold')} />
        <MenuBtn label="Express (non-stop)" hint="skip every stop" onClick={() => onAction('express')} />
        <MenuBtn label="Skip next stop" hint="pass 1, then resume" onClick={() => onAction('skip', 1)} />
        <MenuBtn label="Resume normal" hint="clear overrides" onClick={() => onAction('release')} />
      </div>
    </div>
  )
}

function MenuBtn({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', background: COLORS.BUTTON_BG, color: COLORS.PANEL_TEXT,
        border: `1px solid ${COLORS.PANEL_BORDER}`, borderRadius: 3, padding: '5px 8px',
        fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', lineHeight: 1.25,
      }}
    >
      <div>{label}</div>
      <div style={{ color: COLORS.PANEL_TEXT_DIM, fontSize: 9 }}>{hint}</div>
    </button>
  )
}
