import { normalizePoints } from '../geometryFunc'
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
        const points = normalizePoints(data.Points.map(({ X, Y }) => ({ x: X, y: Y })))
        return {
            points,
            name: data.Type,
        }
    })

