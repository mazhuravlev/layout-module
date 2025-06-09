export interface SectionDto {
    id: string
    name: string
    type: 'lateral' | 'meridional'
    minFloors: number
    maxFloors: number
    outline: { x: number, y: number }[]
}

