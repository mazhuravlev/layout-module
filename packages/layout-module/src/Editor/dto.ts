import { APoint } from '../types'
import { ApartmentProperties } from '../entities/ApartmentProperties'
import { WindowProperties } from '../entities/Window'

export interface ApartmentDto {
    type: 'apartment'
    id: string
    points: APoint[]
    position: APoint
    properties: ApartmentProperties
}

export interface WindowDto {
    type: 'window'
    id: string
    position: APoint
    properties: WindowProperties
}

