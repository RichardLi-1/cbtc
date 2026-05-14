const MIN_ZOOM = 0.2;
const MAX_ZOOM = 40;
export class Viewport {
    constructor() {
        this.camera = { cx: 0, cy: 0, zoom: 5 };
        this.width = 800;
        this.height = 600;
    }
    resize(w, h) {
        this.width = w;
        this.height = h;
    }
    worldToScreen(wx, wy) {
        const sx = (wx - this.camera.cx) * this.camera.zoom + this.width / 2;
        const sy = (wy - this.camera.cy) * this.camera.zoom + this.height / 2;
        return [sx, sy];
    }
    screenToWorld(sx, sy) {
        const wx = (sx - this.width / 2) / this.camera.zoom + this.camera.cx;
        const wy = (sy - this.height / 2) / this.camera.zoom + this.camera.cy;
        return [wx, wy];
    }
    pan(dxScreen, dyScreen) {
        this.camera.cx -= dxScreen / this.camera.zoom;
        this.camera.cy -= dyScreen / this.camera.zoom;
    }
    zoomAtPoint(factor, sx, sy) {
        const [wx, wy] = this.screenToWorld(sx, sy);
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.camera.zoom * factor));
        this.camera.cx = wx - (sx - this.width / 2) / newZoom;
        this.camera.cy = wy - (sy - this.height / 2) / newZoom;
        this.camera.zoom = newZoom;
    }
    fitToBounds(bounds, paddingFraction = 0.1) {
        const bw = bounds.maxX - bounds.minX;
        const bh = bounds.maxY - bounds.minY;
        if (bw === 0 || bh === 0)
            return;
        const zoomX = this.width / bw;
        const zoomY = this.height / bh;
        const zoom = Math.min(zoomX, zoomY) * (1 - paddingFraction);
        this.camera.cx = bounds.minX + bw / 2;
        this.camera.cy = bounds.minY + bh / 2;
        this.camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    }
    /** Returns true if a world-space bounding box intersects the visible area. */
    isVisible(bounds) {
        const [minSx, minSy] = this.worldToScreen(bounds.minX, bounds.minY);
        const [maxSx, maxSy] = this.worldToScreen(bounds.maxX, bounds.maxY);
        const rMinX = Math.min(minSx, maxSx);
        const rMinY = Math.min(minSy, maxSy);
        const rMaxX = Math.max(minSx, maxSx);
        const rMaxY = Math.max(minSy, maxSy);
        return rMaxX >= 0 && rMinX <= this.width && rMaxY >= 0 && rMinY <= this.height;
    }
    /** World-space rect visible through this viewport. */
    visibleWorldBounds() {
        const [minX, minY] = this.screenToWorld(0, 0);
        const [maxX, maxY] = this.screenToWorld(this.width, this.height);
        return { minX, minY, maxX, maxY };
    }
    /** Scale a world-space length to screen pixels. */
    toPixels(worldLen) {
        return worldLen * this.camera.zoom;
    }
    worldVec(points) {
        return points.map(p => this.worldToScreen(p.x, p.y));
    }
}
