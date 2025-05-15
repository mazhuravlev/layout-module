import { Apartment } from './Apartment'
import { SnapService } from './SnapService'
import { APoint, EditorObject, TPoints } from './types'
import { Wall } from './Wall'

interface DragConfigType {
    target: EditorObject
    snapService: SnapService
}

export interface ApartmentDragConfig extends DragConfigType {
    target: Apartment
    start: APoint
    offset: APoint
}
export const isApartmentDragConfig = (config: DragConfigType | null): config is ApartmentDragConfig => {
    return config !== null && config.target instanceof Apartment
}

export interface WallDragConfig extends DragConfigType {
    target: Wall
    startGlobalPoints: TPoints
    offset: number
}

export const isWallDragConfig = (config: DragConfigType | null): config is WallDragConfig => {
    return config !== null && config.target instanceof Wall
}

export type DragConfig = ApartmentDragConfig | WallDragConfig

