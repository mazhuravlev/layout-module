import { z } from 'zod'

export const APointSchema = z.object({
    x: z.number(),
    y: z.number()
})

export const ApartmentPropertiesSchema = z.object({
    isEuro: z.boolean(),
    bedroomCount: z.number().int().nonnegative()
})

export const WindowPropertiesSchema = z.object({
    size: z.number().positive()
})

export const ApartmentDtoSchema = z.object({
    type: z.literal('apartment'),
    id: z.string(),
    points: z.array(APointSchema),
    position: APointSchema,
    properties: ApartmentPropertiesSchema
})

export const WindowDtoSchema = z.object({
    type: z.literal('window'),
    id: z.string(),
    position: APointSchema,
    properties: WindowPropertiesSchema
})

export const SectionOutlineDtoSchema = z.object({
    type: z.literal('sectionOutline'),
    points: z.array(APointSchema),
    offset: z.number()
})

export const EntityDtoSchema = z.discriminatedUnion('type', [
    ApartmentDtoSchema,
    WindowDtoSchema,
])

export const StateTypeSchema = z.object({
    objects: z.array(EntityDtoSchema),
    sectionOutline: SectionOutlineDtoSchema,
})
export type StateType = z.infer<typeof StateTypeSchema>