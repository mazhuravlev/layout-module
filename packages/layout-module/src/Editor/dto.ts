import { APoint } from '../types'
import { ApartmentProperties } from '../entities/ApartmentProperties'
import { WindowProperties } from '../entities/Window'
import { GeometryBlockData } from '../entities/GeometryBlock/GeometryBlockData'

export interface MatrixDto {
    a: number
    b: number
    c: number
    d: number
    tx: number
    ty: number
}

export interface ApartmentDto {
    type: 'apartment'
    id: string
    points: APoint[]
    transform: MatrixDto
    properties: ApartmentProperties
}

export interface WindowDto {
    type: 'window'
    id: string
    position: APoint
    properties: WindowProperties
}

export interface GeometryBlockDto {
    type: 'geometryBlock'
    id: string
    data: GeometryBlockData
    transform: MatrixDto
}
