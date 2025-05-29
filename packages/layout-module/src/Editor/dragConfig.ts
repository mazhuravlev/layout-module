import { Apartment } from '../entities/Apartment'
import { SnapService } from './SnapService'
import { ALine, APoint } from '../types'
import { Wall } from '../entities/Wall'
import { EditorObject } from '../entities/EditorObject'
import { GeometryBlock } from '../entities/GeometryBlock'
import { WindowObj } from '../entities/Window'
import { Container } from 'pixi.js'

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