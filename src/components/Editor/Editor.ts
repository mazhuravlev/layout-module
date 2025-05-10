import { Application, Assets, Sprite, Texture } from 'pixi.js'

export class Editor {
  private app = new Application()

  constructor(private container: HTMLDivElement) {}

  public async init(): Promise<void> {
    const { app, container } = this
    await app.init({
      background: '#ffffff',
      resizeTo: container,
    })
    container.appendChild(app.canvas)
    const texture = (await Assets.load(
      'https://pixijs.com/assets/bunny.png'
    )) as Texture
    const sprite = Sprite.from(texture)
    sprite.anchor.set(0.5)
    sprite.position.set(app.screen.width / 2, app.screen.height / 2)
    sprite.eventMode = 'static'
    sprite.cursor = 'pointer'
    sprite.on('pointerdown', () => {
      sprite.scale.x *= 1.1
      sprite.scale.y *= 1.1
    })

    app.stage.addChild(sprite)
  }

  public async dispose(): Promise<void> {
    // TODO: выгрузить все текстуры
    this.app.destroy(true, { children: true })
  }

  public zoomToExtents() {
    const { app } = this
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
}
