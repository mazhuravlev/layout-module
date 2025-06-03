import { z } from 'zod'

export const APointSchema = z.object({
    x: z.number(),
    y: z.number()
})

export const TransformMatrixSchema = z.object({
    a: z.number(),
    b: z.number(),
    c: z.number(),
    d: z.number(),
    tx: z.number(),
    ty: z.number()
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
    transform: TransformMatrixSchema,
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
})

export const GeometryBlockDataSchema = z.object({
    outline: z.array(APointSchema),
    geometry: z.array(z.array(APointSchema))
})

export const GeometryBlockDtoSchema = z.object({
    type: z.literal('geometryBlock'),
    id: z.string(),
    data: GeometryBlockDataSchema,
    transform: TransformMatrixSchema
})

export const EntityDtoSchema = z.discriminatedUnion('type', [
    ApartmentDtoSchema,
    WindowDtoSchema,
    GeometryBlockDtoSchema,
])

export const EntityDtoArray = z.array(EntityDtoSchema)

export type EntityDto = z.infer<typeof EntityDtoSchema>
export type EntityDtoArray = z.infer<typeof EntityDtoArray>

export const DocumentSchema = z.object({
    objects: z.array(EntityDtoSchema),
    sectionOutline: SectionOutlineDtoSchema,
    sectionId: z.string(),
    sectionOffset: z.number()
})
export type ADocumentType = z.infer<typeof DocumentSchema>