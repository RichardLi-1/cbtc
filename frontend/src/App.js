import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useTopologyStore } from './store/topologyStore';
import { useRuntimeStore } from './store/runtimeStore';
import { CanvasView } from './components/CanvasView';
import { ControlPanel } from './components/ControlPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { BackendNotice } from './components/BackendNotice';
import { InfoPopup } from './components/InfoPopup';
import { EventsPanel } from './components/EventsPanel';
import { DispatchPanel } from './components/DispatchPanel';
import { useUiStore } from './store/uiStore';
import './store/eventsStore';
import { COLORS } from './constants/colors';
import { usePageViewTracker } from './hooks/usePageViewTracker';
export default function App() {
    const { load } = useTopologyStore();
    const { startPolling, stopPolling } = useRuntimeStore();
    const [configOpen, setConfigOpen] = useState(false);
    const { infoOpen, setInfoOpen } = useUiStore();
    usePageViewTracker();
    useEffect(() => {
        load();
        startPolling();
        return () => stopPolling();
    }, [load, startPolling, stopPolling]);
    // Ctrl+Shift+C toggles hidden config panel
    const onKeyDown = useCallback((e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            setConfigOpen(v => !v);
        }
    }, []);
    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onKeyDown]);
    return (_jsxs("div", { style: { position: 'relative', width: '100vw', height: '100vh', background: COLORS.BACKGROUND, overflow: 'hidden' }, children: [_jsx(ControlPanel, {}), _jsx(BackendNotice, {}), _jsx("div", { style: { position: 'absolute', top: 38, left: 0, right: 0, bottom: 0 }, children: _jsx(CanvasView, {}) }), _jsx(EventsPanel, {}), _jsx(DispatchPanel, {}), _jsx(ConfigPanel, { open: configOpen }), _jsx(InfoPopup, { open: infoOpen, onClose: () => setInfoOpen(false) })] }));
}
