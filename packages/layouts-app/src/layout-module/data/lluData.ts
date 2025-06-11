import { getMinXy, subtractVectors } from '../geometryFunc'
import type { LluData } from '../types'
import lluDataJson from './LLUs2.json'
import z from 'zod'

const sectionTypeSchema = z.union([
    z.literal('regular'),
    z.literal('tower'),
    z.literal('corner'),
])

export const lluData: LluData[] = lluDataJson.map(x => {
    const minXy = getMinXy(x.outline)
    const { minFloors, maxFloors } = parseFloorsRange(x.Properties.RangeFloor)
    const llu: LluData = {
        name: x.name,
        outline: x.outline.map(p => subtractVectors(p, minXy)),
        geometry: x.geometry.map(g => g.polyline.map(p => subtractVectors(p, minXy))),
        sectionType: sectionTypeSchema.parse(x.Properties.ContourType.toLowerCase()),
        minFloors,
        maxFloors,
    }
    return llu
})

function parseFloorsRange(input: string | undefined): { minFloors: number; maxFloors: number } {
    if (input === undefined) return { minFloors: 8, maxFloors: 17 }

    const match = input.match(/^(\d+)-(\d+)$/)
    if (!match) {
        throw new Error('Неверный формат. Ожидается строка вида "10-17"')
    }

    const min = parseInt(match[1], 10)
    const max = parseInt(match[2], 10)

    if (isNaN(min) || isNaN(max)) {
        throw new Error('Оба значения должны быть числами')
    }

    if (min > max) {
        throw new Error('Первое число должно быть меньше или равно второму')
    }

    return {
        minFloors: min,
        maxFloors: max
    }
}