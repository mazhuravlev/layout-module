import { APoint } from '../types'

export interface SectionOutlineDto {
    type: 'sectionOutline'
    points: APoint[]
    offset: number
}
