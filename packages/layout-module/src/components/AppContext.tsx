import React, { createContext, useMemo } from 'react'
import { DataAccess } from '../dataAccess/DataAccess'

interface AppContextType {
    dataAccess: DataAccess
}

export const AppContext = createContext<AppContextType>({ dataAccess: new DataAccess() })

interface AppContextProviderProps {
    children: React.ReactNode
    dataAccess: DataAccess
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children, dataAccess }) => {
    const value = useMemo(() => ({ dataAccess }), [dataAccess])
    return <AppContext value={value}>
        {children}
    </AppContext>
}