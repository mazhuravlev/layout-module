import { ADocumentType, DocumentSchema } from '../Editor/dtoSchema'
import { isNull } from '../func'
import { LogicError } from '../types'
import { SectionDto } from './types'
import { parseShapes } from './parseShapes'
import rawShapesJson from './shapesData.json'

export const CURRENT_DOCUMENT_KEY = 'currentDocument.v1'

export class DataAccess {
    async getSections() {
        return Promise.resolve(sectionsData)
    }

    async getSection(sectionId: string) {
        const section = sectionsData.find(x => x.id === sectionId)
        if (section) return section
        throw new LogicError(`Section ${sectionId} not found`)
    }

    async getSectionLayouts(sectionId: string) {
        return []
    }

    async saveSectionLayout(sectionId: string, layoutId: string) {

    }

    async getApartmentTemplates() {
        return parseShapes(rawShapesJson)
    }

    async saveCurrentDocument(document: ADocumentType) {
        localStorage.setItem(CURRENT_DOCUMENT_KEY, JSON.stringify(document))
    }

    async loadCurrentDocument() {
        const data = localStorage.getItem(CURRENT_DOCUMENT_KEY)
        if (isNull(data)) return null
        return DocumentSchema.parseAsync(JSON.parse(data))
    }
}

const sectionsData: SectionDto[] = [
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
]
