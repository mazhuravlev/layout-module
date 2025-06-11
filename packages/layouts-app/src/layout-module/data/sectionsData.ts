import type { SectionDto } from '../Editor/dto'

export const sectionsData: SectionDto[] = [
    {
        id: '7814470a-9017-41d1-9721-9fd87e61e634',
        name: '15 х 25',
        type: 'lateral',
        minFloors: 9,
        maxFloors: 16,
        outline: [
            { x: 0, y: 0 },
            { x: 0, y: 15000 },
            { x: 25000, y: 15000 },
            { x: 25000, y: 0 },
        ],
    },
    {
        id: '1faefa99-4eb9-4462-9c0f-2dea55ddbc9a',
        name: '15 х 23',
        type: 'meridional',
        minFloors: 9,
        maxFloors: 16,
        outline: [
            { x: 0, y: 0 },
            { x: 0, y: 15000 },
            { x: 23000, y: 15000 },
            { x: 23000, y: 0 },
        ],
    },
    {
        id: 'f28a1dd4-9cba-40ad-aeae-f479ef4c7e64',
        name: 'Угловая',
        type: 'corner',
        minFloors: 9,
        maxFloors: 16,
        outline: [
            {
                'x': 28145.859705748386,
                'y': 20253.01866401639,
            },
            {
                'x': 4905.837522130285,
                'y': 20253.027074272744,
            },
            {
                'x': 0,
                'y': 4242.0823368350975,
            },
            {
                'x': 13844.679029411578,
                'y': 0,
            },
            {
                'x': 15613.562255563738,
                'y': 5773.018664714415,
            },
            {
                'x': 28145.85970577516,
                'y': 5773.018663608469,
            },
        ],
    },
]