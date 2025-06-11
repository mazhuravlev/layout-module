import { z } from 'zod'

export const ApartmentPropertiesSchema = z.object({
    isEuro: z.boolean().optional(),
    bedroomCount: z.number().int().nonnegative(),
})

export interface ApartmentProperties {
    isEuro: boolean;
    bedroomCount: number;
}
export const defaultApartmentProperties: ApartmentProperties = {
    isEuro: false,
    bedroomCount: 0,
} 
