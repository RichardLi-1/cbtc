import type { Bounds, Vec2 } from '../types/domain'

export interface Camera {
  /** World X at centre of canvas */
  cx: number
  /** World Y at centre of canvas */
  cy: number
  /** Pixels per metre */
  zoom: number
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 40

export class Viewport {
  camera: Camera = { cx: 0, cy: 0, zoom: 5 }
  width = 800
  height = 600

  resize(w: number, h: number): void {
    this.width = w
    this.height = h
  }

  worldToScreen(wx: number, wy: number): [number, number] {
    const sx = (wx - this.camera.cx) * this.camera.zoom + this.width / 2
    const sy = (wy - this.camera.cy) * this.camera.zoom + this.height / 2
    return [sx, sy]
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    const wx = (sx - this.width / 2) / this.camera.zoom + this.camera.cx
    const wy = (sy - this.height / 2) / this.camera.zoom + this.camera.cy
    return [wx, wy]
  }

  pan(dxScreen: number, dyScreen: number): void {
    this.camera.cx -= dxScreen / this.camera.zoom
    this.camera.cy -= dyScreen / this.camera.zoom
  }

  zoomAtPoint(factor: number, sx: number, sy: number): void {
    const [wx, wy] = this.screenToWorld(sx, sy)
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.camera.zoom * factor))
    this.camera.cx = wx - (sx - this.width / 2) / newZoom
    this.camera.cy = wy - (sy - this.height / 2) / newZoom
    this.camera.zoom = newZoom
  }

  fitToBounds(bounds: Bounds, paddingFraction = 0.1): void {
    const bw = bounds.maxX - bounds.minX
    const bh = bounds.maxY - bounds.minY
    if (bw === 0 || bh === 0) return
    const zoomX = this.width / bw
    const zoomY = this.height / bh
    const zoom = Math.min(zoomX, zoomY) * (1 - paddingFraction)
    this.camera.cx = bounds.minX + bw / 2
    this.camera.cy = bounds.minY + bh / 2
    this.camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
  }

  /** Returns true if a world-space bounding box intersects the visible area. */
  isVisible(bounds: Bounds): boolean {
    const [minSx, minSy] = this.worldToScreen(bounds.minX, bounds.minY)
    const [maxSx, maxSy] = this.worldToScreen(bounds.maxX, bounds.maxY)
    const rMinX = Math.min(minSx, maxSx)
    const rMinY = Math.min(minSy, maxSy)
    const rMaxX = Math.max(minSx, maxSx)
    const rMaxY = Math.max(minSy, maxSy)
    return rMaxX >= 0 && rMinX <= this.width && rMaxY >= 0 && rMinY <= this.height
  }

  /** World-space rect visible through this viewport. */
  visibleWorldBounds(): Bounds {
    const [minX, minY] = this.screenToWorld(0, 0)
    const [maxX, maxY] = this.screenToWorld(this.width, this.height)
    return { minX, minY, maxX, maxY }
  }

  /** Scale a world-space length to screen pixels. */
  toPixels(worldLen: number): number {
    return worldLen * this.camera.zoom
  }

  worldVec(points: Vec2[]): [number, number][] {
    return points.map(p => this.worldToScreen(p.x, p.y))
  }
}
