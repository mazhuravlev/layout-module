export type APoint = {
    x: number
    y: number
}

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