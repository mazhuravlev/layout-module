import { use } from 'react'
import { useQuery } from 'react-query'
import { AppContext } from './AppContext'
import { DataAccess } from '../dataAccess/DataAccess'

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
        queryKey: ['sections'],
        queryFn: () => dataAccess.getSections(),
    })
}

export function useApartmentTemplates() {
    const dataAccess = useDataAccess()

    return useQuery({
        queryFn: () => dataAccess.getApartmentTemplates()
    })
}