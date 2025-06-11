import { use } from 'react'
import { AppContext } from '../AppContext'
import type { DataAccess } from '../../DataAccess/DataAccess'
import { useQuery } from '@tanstack/react-query'
import type { FloorRange } from '../../types'

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
        queryFn: () => dataAccess.getApartmentTemplates(),
    })
}

export function useLLU(filter: FloorRange) {
    const dataAccess = useDataAccess()
    return useQuery({
        queryKey: ['LLU'] as const,
        queryFn: () => dataAccess.getLLUsFiltered(filter),
    })
}

export function useSectionLayouts(sectionId: string) {
    const dataAccess = useDataAccess()
    return useQuery({
        queryKey: ['SectionLayouts', sectionId] as const,
        queryFn: () => dataAccess.getSectionLayouts(sectionId),
    })
}
