import { Application, Graphics } from 'pixi.js'
import { calculateZoomToExtents } from './func'
import { ApartmentShape, Point } from '../outline/types';
import { Logger } from '../logger';

export class Editor {
  private app = new Application()
  private logger = new Logger('Editor')
  private sectionOutline: { graphics: Graphics; points: Point[] } | null = null

  /**
   * @description Cleanup functions to be called on dispose
   */
  private cleanupFns: (() => void)[] = []

  constructor(private container: HTMLDivElement) { }

  public async init(): Promise<void> {
    const { app, container } = this
    await app.init({
      background: '#ffffff',
      resizeTo: container,
    })
    container.appendChild(app.canvas)
  }

  /**
   * @param fn Function to be called on dispose
   * @description This function is called when the editor is disposed. It can be used to clean up resources, such as event listeners or textures.
   */
  public addCleanupFn(fn: () => void) {
    this.cleanupFns.push(fn)
  }

  public async dispose(): Promise<void> {
    // TODO: выгрузить все текстуры
    this.app.destroy(true, { children: true })
    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []
  }

  public setSectionOutline(points: Point[]) {
    const { app } = this
    const graphics = new Graphics()
    drawOutline(graphics, points)
    app.stage.addChild(graphics)
    this.sectionOutline = { graphics, points }
  }

  public addApartment(shape: ApartmentShape) {
    const { app } = this
    const graphics = new Graphics()
    drawOutline(graphics, shape.points)
    graphics.interactive = true
    graphics.eventMode = 'static'
    graphics.on('click', () => {
    })
    graphics.on('mouseover', () => {
      graphics.fill({ color: 0x3333ff })
      graphics.stroke({ color: 0x0, pixelLine: true, width: 1 })
    })
    graphics.on('mouseout', () => {
      graphics.fill({ color: 0xffffff })
      graphics.stroke({ color: 0x0, pixelLine: true, width: 1 })
    })
    app.stage.addChild(graphics)
  }

  public zoomToExtents() {
    const { app } = this
    if (!app.stage.children.length) return
    const { centerX, scale, centerY } = calculateZoomToExtents(app, 20)
    app.stage.position.set(
      app.screen.width / 2 - centerX * scale,
      app.screen.height / 2 - centerY * scale
    )
    app.stage.scale.set(scale)
  }
}

export const drawOutline = (graphics: Graphics, points: Point[]) => {
  graphics.clear()
  graphics.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y)
  }
  graphics.lineTo(points[0].x, points[0].y)
  graphics.fill({ color: 0xffffff })
  graphics.stroke({ color: 0x0, pixelLine: true, width: 1 })
}

