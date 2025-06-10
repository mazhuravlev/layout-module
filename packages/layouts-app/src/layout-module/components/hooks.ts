import { use } from 'react'
import { useQuery } from 'react-query'
import { AppContext } from './AppContext'
import type { DataAccess } from '../DataAccess/DataAccess'

export function useDataAccess(): DataAccess {
    const context = use(AppContext)
    if (!context) {
        throw new Error('useDataAccess must be used within DataAccessProvider')
    }
    return context.dataAccess
}

export function useSections() {
    const dataAccess = useDataAccess()
    return useQuery({
        queryKey: ['Sections'] as const,
        queryFn: () => dataAccess.getSections(),
    })
}

export function useApartmentTemplates() {
    const dataAccess = useDataAccess()
    return useQuery({
        queryKey: ['ApartmentTemplates'] as const,
        queryFn: () => dataAccess.getApartmentTemplates()
    })
}

export function useSectionLayouts(sectionId: string) {
    const dataAccess = useDataAccess()
    return useQuery({
        queryKey: ['SectionLayouts', sectionId] as const,
        queryFn: () => dataAccess.getSectionLayouts(sectionId)
    })
}