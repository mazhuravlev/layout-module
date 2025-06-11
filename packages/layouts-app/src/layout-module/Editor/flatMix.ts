import { assertDefined } from '../func'

export interface FlatTypeConfig {
    bedroomCount: number
    isEuro: boolean
    minArea: number
    maxArea: number
    typeName: string
}

export const calculateApartmentType = (flatmix: FlatTypeConfig[], apartment: { area: number, bedroomCount: number, isEuro: boolean }) => {
    const sameBedroomCount = flatmix.filter(x => x.bedroomCount === apartment.bedroomCount && x.isEuro === apartment.isEuro)
    if (sameBedroomCount.length > 0) {
        if (apartment.area < Math.min(...sameBedroomCount.map(x => x.minArea))) return 'XS'
        if (apartment.area > Math.max(...sameBedroomCount.map(x => x.maxArea))) return 'XL'
        const matchArea = sameBedroomCount
            .find(x => x.minArea <= apartment.area && x.maxArea >= apartment.area && x.isEuro === apartment.isEuro)
        if (matchArea === undefined) return '_U'
        return assertDefined(matchArea, 'Должен быть хотя бы один подходящий тип квартиры').typeName
    } else {
        return 'M'
    }
}

export const exampleFlatmix: FlatTypeConfig[] = [
    {
        'bedroomCount': 0,
        'isEuro': false,
        'minArea': 26,
        'maxArea': 30,
        'typeName': 'L',
    },
    {
        'bedroomCount': 1,
        'isEuro': false,
        'minArea': 36,
        'maxArea': 40,
        'typeName': 'M',
    },
    {
        'bedroomCount': 1,
        'isEuro': false,
        'minArea': 41,
        'maxArea': 45,
        'typeName': 'L',
    },
    {
        'bedroomCount': 2,
        'isEuro': false,
        'minArea': 55,
        'maxArea': 59,
        'typeName': 'M',
    },
    {
        'bedroomCount': 2,
        'isEuro': false,
        'minArea': 60,
        'maxArea': 65,
        'typeName': 'L',
    },
    {
        'bedroomCount': 3,
        'isEuro': false,
        'minArea': 68,
        'maxArea': 73,
        'typeName': 'S',
    },
    {
        'bedroomCount': 3,
        'isEuro': false,
        'minArea': 74,
        'maxArea': 80,
        'typeName': 'M',
    },
]
