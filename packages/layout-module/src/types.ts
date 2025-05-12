export type PointLike = {
    x: number
    y: number
}

export interface ApartmentTemplate {
    name: string
    points: PointLike[]
}