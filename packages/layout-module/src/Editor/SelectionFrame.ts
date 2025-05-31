import { Graphics, Container, Bounds } from 'pixi.js'
import { APoint } from '../types'
import { EDITOR_CONFIG } from './editorConfig'
import { makeBounds } from '../geometryFunc'

export class SelectionFrame {
    private _container = new Container()
    private _rectangle = new Graphics()
    private _dashedBorder: Graphics | null = null
    private _startPoint: APoint
    private _currentPoint: APoint
    private _isLeftToRight = true

    constructor(startPoint: APoint) {
        this._startPoint = startPoint
        this._currentPoint = startPoint
        this._container.addChild(this._rectangle)
        this._container.zIndex = 1000 // Ensure it's drawn on top
    }

    public get container() {
        return this._container
    }

    /**
     * В глобальных координатах
     */
    public get globalBounds(): Bounds {
        return makeBounds(
            this._container.toGlobal(this._startPoint),
            this._container.toGlobal(this._currentPoint)
        )
    }

    private get bounds(): Bounds {
        return makeBounds(this._startPoint, this._currentPoint)
    }

    public get isLeftToRight() {
        return this._isLeftToRight
    }

    public update(currentPoint: APoint) {
        this._currentPoint = currentPoint
        this._isLeftToRight = currentPoint.x >= this._startPoint.x
        this.redraw()
    }

    private redraw() {
        const { x, y, width, height } = this.bounds

        // Clean up previous dashed border if it exists
        if (this._dashedBorder) {
            this._container.removeChild(this._dashedBorder)
            this._dashedBorder.destroy()
            this._dashedBorder = null
        }

        this._rectangle.clear()

        if (this._isLeftToRight) {
            // Left-to-right: solid line, light blue fill (window selection)
            this._rectangle
                .rect(x, y, width, height)
                .fill({
                    color: EDITOR_CONFIG.SELECTION_FRAME.WINDOW_FILL_COLOR,
                    alpha: EDITOR_CONFIG.SELECTION_FRAME.FILL_ALPHA
                })
                .stroke({
                    color: EDITOR_CONFIG.SELECTION_FRAME.WINDOW_STROKE_COLOR,
                    width: EDITOR_CONFIG.SELECTION_FRAME.STROKE_WIDTH,
                    alpha: EDITOR_CONFIG.SELECTION_FRAME.STROKE_ALPHA
                })
        } else {
            // Right-to-left: dashed line, green fill (crossing selection)
            this.drawDashedBorder(x, y, width, height)
        }
    }

    private drawDashedBorder(x: number, y: number, width: number, height: number) {
        const dashLength = EDITOR_CONFIG.SELECTION_FRAME.DASH_LENGTH
        const gapLength = EDITOR_CONFIG.SELECTION_FRAME.GAP_LENGTH
        const strokeWidth = EDITOR_CONFIG.SELECTION_FRAME.STROKE_WIDTH
        const color = EDITOR_CONFIG.SELECTION_FRAME.CROSSING_STROKE_COLOR

        // Clear any previous dashed lines
        this._rectangle.clear()

        // Draw the fill first
        this._rectangle
            .rect(x, y, width, height)
            .fill({
                color: EDITOR_CONFIG.SELECTION_FRAME.CROSSING_FILL_COLOR,
                alpha: EDITOR_CONFIG.SELECTION_FRAME.FILL_ALPHA
            })

        // Create a new Graphics object for the dashed border
        const dashedBorder = new Graphics()

        // Top edge
        this.drawDashedLine(dashedBorder, x, y, x + width, y, dashLength, gapLength, strokeWidth, color)

        // Right edge  
        this.drawDashedLine(dashedBorder, x + width, y, x + width, y + height, dashLength, gapLength, strokeWidth, color)

        // Bottom edge
        this.drawDashedLine(dashedBorder, x + width, y + height, x, y + height, dashLength, gapLength, strokeWidth, color)

        // Left edge
        this.drawDashedLine(dashedBorder, x, y + height, x, y, dashLength, gapLength, strokeWidth, color)

        // Add the dashed border to the container
        this._container.addChild(dashedBorder)

        // Store reference to clean up later
        if (!this._dashedBorder) {
            this._dashedBorder = dashedBorder
        }
    }

    private drawDashedLine(
        graphics: Graphics,
        x1: number, y1: number,
        x2: number, y2: number,
        dashLength: number, gapLength: number,
        strokeWidth: number, color: number
    ) {
        const totalLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        const unitX = (x2 - x1) / totalLength
        const unitY = (y2 - y1) / totalLength

        let currentLength = 0
        const patternLength = dashLength + gapLength

        while (currentLength < totalLength) {
            const dashStart = currentLength
            const dashEnd = Math.min(currentLength + dashLength, totalLength)

            if (dashEnd > dashStart) {
                const startX = x1 + unitX * dashStart
                const startY = y1 + unitY * dashStart
                const endX = x1 + unitX * dashEnd
                const endY = y1 + unitY * dashEnd

                graphics
                    .moveTo(startX, startY)
                    .lineTo(endX, endY)
                    .stroke({
                        color,
                        width: strokeWidth,
                        alpha: EDITOR_CONFIG.SELECTION_FRAME.STROKE_ALPHA
                    })
            }

            currentLength += patternLength
        }
    }

    public dispose() {
        if (this._dashedBorder) {
            this._dashedBorder.destroy()
        }
        this._container.removeFromParent()
        this._rectangle.destroy()
        this._container.destroy()
    }
}