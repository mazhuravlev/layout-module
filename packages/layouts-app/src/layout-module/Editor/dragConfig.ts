import type { Apartment } from '../entities/Apartment'
import type { SnapService } from './SnapService'
import type { ALine, APoint } from '../types'
import type { Wall } from '../entities/Wall'
import type { EditorObject } from '../entities/EditorObject'
import type { GeometryBlock } from '../entities/GeometryBlock'
import type { WindowObj } from '../entities/Window'
import type { Container } from 'pixi.js'

interface DragConfigType {
    target: EditorObject
    snapService: SnapService
}

export interface BlockDragConfig extends DragConfigType {
    type: 'dragBlock'

    target: Apartment | GeometryBlock

    /**
     * Начальные собственные координаты квартиры.
     * В локальных координатах родительского контейнера.
     */
    startPos: APoint

    /**
     * Координаты точки, с которой начнется перетаскивание.
     * В глобальных координатах.
     */
    startMousePos: APoint

    /**
     * Точки контура квартиры до начала перемещения
     */
    originalGlobalPoints: APoint[]

    dragOutline: Container
}

export interface WallDragConfig extends DragConfigType {
    type: 'dragWall'
    target: Wall
    originalWallGlobalLine: ALine
    originalApartmentPoints: APoint[]
}

export interface WindowDragConfig {
    type: 'dragWindow'
    target: WindowObj
    snapService: SnapService
    startMousePos: APoint
    originalCenterPoint: APoint
    // Точки контура секции для привязки окна к контуру
    sectionOutlinePoints: APoint[]

    dragOutline: Container
}


export type DragConfig = BlockDragConfig | WallDragConfig | WindowDragConfig

export const withDragOutline = (dragConfig: DragConfig, fn: (dragOutline: Container) => void) => {
    if ('dragOutline' in dragConfig) {
        fn(dragConfig.dragOutline)
    }
}