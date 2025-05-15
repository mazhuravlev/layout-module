
export type APoint = {
    x: number
    y: number
}

export type TPoints = [APoint, APoint]

export interface ALine {
    start: APoint;
    end: APoint;
}

export interface ApartmentTemplate {
    name: string
    points: APoint[]
}

export interface IDisposable {
    dispose(): void
}

export class EditorObject {

}

export type CoordType = 'local' | 'global'


