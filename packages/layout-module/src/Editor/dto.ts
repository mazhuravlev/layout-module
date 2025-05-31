import { APoint, LogicError } from '../types'
import { ApartmentProperties } from '../entities/ApartmentProperties'
import { WindowObj, WindowProperties } from '../entities/Window'
import { GeometryBlockData } from '../entities/GeometryBlock/GeometryBlockData'
import { EditorObject } from '../entities/EditorObject'
import { Apartment } from '../entities/Apartment'
import { GeometryBlock } from '../entities/GeometryBlock/GeometryBlock'

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

export type EditorObjectDto =
    | ApartmentDto
    | WindowDto
    | GeometryBlockDto

export const serializeEditorObject = (o: EditorObject): EditorObjectDto | null => {
    if (o.serializable === false) return null
    if (o instanceof Apartment) return o.serialize()
    if (o instanceof WindowObj) return o.serialize()
    if (o instanceof GeometryBlock) return o.serialize()
    throw new LogicError()
}

// Type guards for each object type
export const isApartmentDto = (obj: EditorObjectDto): obj is ApartmentDto => {
    return obj.type === 'apartment'
}

export const isWindowDto = (obj: EditorObjectDto): obj is WindowDto => {
    return obj.type === 'window'
}

export const isGeometryBlockDto = (obj: EditorObjectDto): obj is GeometryBlockDto => {
    return obj.type === 'geometryBlock'
}

// Functions to check if all objects in array are of specific type
export const areAllApartments = (objects: EditorObjectDto[]): objects is ApartmentDto[] => {
    return objects.every(isApartmentDto)
}

export const areAllWindows = (objects: EditorObjectDto[]): objects is WindowDto[] => {
    return objects.every(isWindowDto)
}

export const areAllOfType = <T extends EditorObjectDto>(
    objects: EditorObjectDto[],
    typeGuard: (obj: EditorObjectDto) => obj is T
): objects is T[] => {
    return objects.every(typeGuard)
}

export const getTypeCounts = (objects: EditorObjectDto[]) => {
    return objects.reduce(
        (counts, obj) => {
            counts[obj.type]++
            return counts
        },
        { apartment: 0, window: 0, geometryBlock: 0 }
    )
}

// Function to filter objects by type
export const filterByType = {
    apartments: (objects: EditorObjectDto[]): ApartmentDto[] =>
        objects.filter(isApartmentDto),

    windows: (objects: EditorObjectDto[]): WindowDto[] =>
        objects.filter(isWindowDto),

    geometryBlocks: (objects: EditorObjectDto[]): GeometryBlockDto[] =>
        objects.filter(isGeometryBlockDto)
}

// Function to group objects by type
export const groupByType = (objects: EditorObjectDto[]) => {
    return {
        apartments: filterByType.apartments(objects),
        windows: filterByType.windows(objects),
        geometryBlocks: filterByType.geometryBlocks(objects)
    }
}

// Function to check if array contains only one type and return that type
export const getSingleType = (objects: EditorObjectDto[]): EditorObjectDto['type'] | null => {
    if (objects.length === 0) return null

    const firstType = objects[0].type
    return objects.every(obj => obj.type === firstType) ? firstType : null
}

// Function to validate that all objects are of expected type with error message
export const validateAllOfType = (
    objects: EditorObjectDto[],
    expectedType: EditorObjectDto['type']
): { valid: boolean; message?: string } => {
    if (objects.length === 0) {
        return { valid: true }
    }

    const invalidObjects = objects.filter(obj => obj.type !== expectedType)

    if (invalidObjects.length === 0) {
        return { valid: true }
    }

    const invalidTypes = [...new Set(invalidObjects.map(obj => obj.type))]
    return {
        valid: false,
        message: `Expected all objects to be of type '${expectedType}', but found ${invalidObjects.length} object(s) of type(s): ${invalidTypes.join(', ')}`
    }
}
