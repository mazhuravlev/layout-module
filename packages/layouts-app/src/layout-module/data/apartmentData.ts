import type { ApartmentTemplate } from '../types'
import flats from './Flats_11_06_25.json'

interface FlatRecord {
    id: string;
    Points: {
        X: number;
        Y: number;
        Z: string;
    }[];
    Type: string;
}

export const apartmentTemplates: ApartmentTemplate[] = flats
    .map((data: FlatRecord) => {
        const xs = data.Points.map((v) => v.X)
        const ys = data.Points.map((v) => v.Y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)

        const points = data.Points.map((v) => {
            const localX = (v.X - minX)
            const localY = (v.Y - minY)
            return { x: localX, y: localY }
        })
        return {
            points,
            name: data.Type,
        }
    })
