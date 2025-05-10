import React, { use, useEffect, useRef } from 'react'
import styles from './Editor.module.scss'
import { Application, Graphics, Text } from 'pixi.js'
import { EditorProps } from './EditorProps'
import { assertDefined } from '../../func'
import { addApartmentEvent } from '../ToolSidebar/events'
import { drawOutline } from '../../outline/pixi'
import { Logger } from '../../logger'
import { Subscription } from 'effector'
;(window as any).editors = []

export class Editor extends React.Component<EditorProps> {
  private subscriptions: Subscription[] = []
  private containerRef = React.createRef<HTMLDivElement>()
  private app: Application | null = null
  private logger: Logger
  private appInitPromises: Promise<void>[] = []

  constructor(props: EditorProps) {
    super(props)
    this.logger = new Logger('Editor')
    ;(window as any).editors.push(this)
  }

  componentDidMount(): void {
    this.logger.debug(`Editor mounted`)
    const container = assertDefined(this.containerRef.current)
    const app = (this.app = new Application())
    const appInitPromise = app.init({
      background: '#ffffff',
      resizeTo: container,
    })
    this.appInitPromises.push(appInitPromise)
    const run = async () => {
      await Promise.all(this.appInitPromises)
      container.appendChild(app.canvas)
      this.logger.debug('App initialized')

      const sectionGraphics = new Graphics()
      drawOutline(sectionGraphics, this.props.sectionOutline)
      app.stage.addChild(sectionGraphics)

      const self = this
      this.subscriptions.push(
        addApartmentEvent.watch((apartmentShape) => {
          this.ensureApp()
          console.log(self.app?.stage)
          const apartmentGraphics = new Graphics()
          drawOutline(apartmentGraphics, apartmentShape.points)
          app.stage.addChild(apartmentGraphics)
          zoomToExtents(app)
        })
      )
      zoomToExtents(app)
    }
    run()
  }

  render() {
    return <div ref={this.containerRef} className={styles.container}></div>
  }

  componentWillUnmount(): void {
    if (this.app) {
      const app = this.app
      this.app = null

      const subscriptions = this.subscriptions
      this.subscriptions = []

      Promise.all(this.appInitPromises).then(() => {
        app.destroy(
          { removeView: true },
          {
            children: true,
            texture: true,
          }
        )
        this.logger.debug('App destroyed')
      })
      subscriptions.forEach((s) => s())
    }
  }

  private ensureApp() {
    if (!this.app || this.app.stage === null) {
      throw new Error('App is not initialized')
    }
  }
}

function zoomToExtents(app: Application) {
  if (!app.stage.children.length) return

  // 1. Вычисляем общий bounding box всех объектов
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  app.stage.children.forEach((child) => {
    const bounds = child.getBounds()
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  })

  // 2. Вычисляем центр и размер контента
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const width = maxX - minX
  const height = maxY - minY

  // 3. Вычисляем масштаб (с отступами 20px)
  const padding = 20
  const scaleX = (app.screen.width - padding) / width
  const scaleY = (app.screen.height - padding) / height
  const scale = Math.min(scaleX, scaleY, 1) // Не увеличивать больше 100%

  // 4. Применяем трансформацию
  app.stage.position.set(
    app.screen.width / 2 - centerX * scale,
    app.screen.height / 2 - centerY * scale
  )
  app.stage.scale.set(scale)
}
