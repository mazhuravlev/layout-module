import { Apartment } from '../entities/Apartment'
import { SnapService } from './SnapService'
import { APoint, EditorObject, TPoints } from '../types'
import { Wall } from '../entities/Wall'

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

export interface WallDragConfig extends DragConfigType {
    type: 'dragWall'
    target: Wall
    originalWallGlobalPoints: TPoints
    originalApartmentPoints: APoint[]
}


export type DragConfig = ApartmentDragConfig | WallDragConfig

