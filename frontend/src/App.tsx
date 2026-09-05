import { useEffect, useState, useCallback } from 'react'
import { useTopologyStore } from './store/topologyStore'
import { useRuntimeStore } from './store/runtimeStore'
import { CanvasView } from './components/CanvasView'
import { ControlPanel } from './components/ControlPanel'
import { ConfigPanel } from './components/ConfigPanel'
import { BackendNotice } from './components/BackendNotice'
import { InfoPopup } from './components/InfoPopup'
import { HelpChat } from './components/HelpChat'
import { EventsPanel } from './components/EventsPanel'
import { DispatchPanel } from './components/DispatchPanel'
import { useUiStore } from './store/uiStore'
import './store/eventsStore'
import { COLORS } from './constants/colors'
import { usePageViewTracker } from './hooks/usePageViewTracker'
import { isMlEnabled } from './config/ml'
import { fetchMlHealth } from './api/client'
import { useConnectionStore } from './store/connectionStore'

export default function App() {
  const { load } = useTopologyStore()
  const { startPolling, stopPolling } = useRuntimeStore()
  const [configOpen, setConfigOpen] = useState(false)
  const { infoOpen, setInfoOpen, toggleDevMode, highContrast } = useUiStore()

  usePageViewTracker()
  const mlOn = isMlEnabled()

  useEffect(() => {
    load()
    startPolling()
    return () => stopPolling()
  }, [load, startPolling, stopPolling])

  useEffect(() => {
    if (!mlOn) return
    let cancelled = false
    let timer = 0
    const graceUntil = Date.now() + 60_000

    const tick = async () => {
      try {
        await fetchMlHealth()
        if (!cancelled) useConnectionStore.getState().report('ml', 'ok')
      } catch (err) {
        // Vite returns HTTP 500 while :8001 is still starting. Wait before alarming.
        if (!cancelled && Date.now() >= graceUntil) {
          useConnectionStore.getState().report('ml', 'error', String(err))
        }
      }
      if (!cancelled) timer = window.setTimeout(() => { void tick() }, 3000)
    }

    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mlOn])

  // Ctrl+Shift+C = hidden config. Ctrl+Shift+D = endpoint dots (dev mode).
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault()
      setConfigOpen(v => !v)
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault()
      toggleDevMode()
    }
  }, [toggleDevMode])
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  return (
    <div
      data-contrast={highContrast ? 'high' : 'normal'}
      style={{ position: 'relative', width: '100vw', height: '100vh', background: COLORS.BACKGROUND, overflow: 'hidden' }}
    >
      <ControlPanel />
      <BackendNotice />
      <div data-help="map" style={{ position: 'absolute', top: 38, left: 0, right: 0, bottom: 0 }}>
        <CanvasView />
      </div>
      <EventsPanel />
      {mlOn && <DispatchPanel />}
      <ConfigPanel open={configOpen} />
      <HelpChat />
      <InfoPopup open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  )
}
