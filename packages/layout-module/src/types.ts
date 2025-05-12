export type PointLike = {
    x: number
    y: number
}

export interface ApartmentTemplate {
    name: string
    points: PointLike[]
}

export interface IDisposable {
    dispose(): void
}