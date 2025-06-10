import { EditorDocument, LogicError, NotFoundError } from '../types'
import { SectionDto } from './types'
import { parseShapes } from './parseShapes'
import rawShapesJson from './shapesData.json'
import Dexie from 'dexie'

export interface EditorDocumentRecord {
    id: string
    sectionId: string
    name: string,
    data: string
}

class LayoutDb extends Dexie {
    layouts!: Dexie.Table<EditorDocumentRecord, string>

    constructor() {
        super('layout-module')
        this.version(1).stores({
            layouts: 'id, sectionId, name, data',
        })
    }
}

const db = new LayoutDb()

export class DataAccess {
    public async getLayout(id: string) {
        const layout = await db
            .layouts
            .where('id')
            .equals(id)
            .first()
        if (layout === undefined) throw new NotFoundError()
        const json = JSON.parse(layout.data)
        // TODO: добавить валидацию
        return json as EditorDocument
    }

    public async getSections() {
        return Promise.resolve(sectionsData)
    }

    public async getSection(sectionId: string) {
        const section = sectionsData.find(x => x.id === sectionId)
        if (section) return section
        throw new LogicError(`Section ${sectionId} not found`)
    }

    public async getSectionLayouts(sectionId: string) {
        const layouts = await db
            .layouts
            .where('sectionId')
            .equals(sectionId)
            .toArray()
        return layouts
    }

    public async getApartmentTemplates() {
        return parseShapes(rawShapesJson)
    }

    public async saveLayout(doc: EditorDocument) {
        db.layouts.put({
            id: doc.layoutId,
            sectionId: doc.sectionId,
            name: doc.name,
            data: JSON.stringify(doc)
        })
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
