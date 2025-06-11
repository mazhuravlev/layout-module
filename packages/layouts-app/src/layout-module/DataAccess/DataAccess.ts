import type { EditorDocument } from '../types'
import { LogicError, NotFoundError } from '../types'
import Dexie from 'dexie'
import { apartmentTemplates } from '../data/apartmentData'
import { sectionsData } from '../data/sectionsData'
import { lluData } from '../data/lluData'

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

    public async getLlu() {
        return lluData
    }

    public async getLluFiltered(options: { minFloors: number, maxFloors: number }) {
        return lluData
            .filter(x => x.minFloors >= options.minFloors && x.maxFloors <= options.maxFloors)
    }

    public async getApartmentTemplates() {
        return apartmentTemplates
    }

    public async saveLayout(doc: EditorDocument) {
        db.layouts.put({
            id: doc.layoutId,
            sectionId: doc.sectionId,
            name: doc.name,
            data: JSON.stringify(doc),
        })
    }
}

