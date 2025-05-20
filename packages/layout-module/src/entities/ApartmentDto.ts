import { APoint } from '../types'
import { ApartmentProperties } from './ApartmentProperties'

export interface ApartmentDto {
    id: string;
    points: APoint[];
    position: APoint;
    properties: ApartmentProperties;
}
