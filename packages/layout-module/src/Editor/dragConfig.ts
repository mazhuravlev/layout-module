import { Apartment } from './Apartment'
import { SnapService } from './SnapService'
import { APoint, EditorObject, TPoints } from './types'
import { Wall } from './Wall'

interface DragConfigType {
    target: EditorObject
    snapService: SnapService
}

export interface ApartmentDragConfig extends DragConfigType {
    type: 'dragApartment'

    target: Apartment

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
}

export const isApartmentDragConfig = (config: DragConfig | null): config is ApartmentDragConfig => {
    return config !== null && config.type === 'dragWall'
}

export interface WallDragConfig extends DragConfigType {
    type: 'dragWall'
    target: Wall
    startGlobalPoints: TPoints
}

export const isWallDragConfig = (config: DragConfig | null): config is WallDragConfig => {
    return config !== null && config.type === 'dragWall'
}

export type DragConfig = ApartmentDragConfig | WallDragConfig

