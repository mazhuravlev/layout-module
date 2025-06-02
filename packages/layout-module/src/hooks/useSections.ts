import { useQuery } from 'react-query'
import { DataAccess } from '../dataAccess/DataAccess'

export const createUseSections = (dataAccess: DataAccess) => {
    return () => useQuery('sections', () => dataAccess.getSections())
}