import React, { useMemo } from 'react'
import type { DataAccess } from '../DataAccess/DataAccess'
import { AppContext } from './AppContext'

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
