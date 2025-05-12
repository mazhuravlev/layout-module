import { Application } from "pixi.js"

export function calculateZoomToExtents(app: Application, padding: number) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
    app.stage.children.forEach((child) => {
      const bounds = child.getBounds()
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    })
  
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const width = maxX - minX
    const height = maxY - minY
  
    const scaleX = (app.screen.width - padding) / width
    const scaleY = (app.screen.height - padding) / height
    const scale = Math.min(scaleX, scaleY)
    return { centerX, scale, centerY }
  }
  