import { createContext } from 'react'
import { DataAccess } from '../DataAccess/DataAccess'

interface AppContextType {
    dataAccess: DataAccess
}

export const AppContext = createContext<AppContextType>({ dataAccess: new DataAccess() })
