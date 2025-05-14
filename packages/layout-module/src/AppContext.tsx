import { createContext } from 'react'
import { ApartmentTemplate, APoint } from './types'

export const AppContext = createContext<AppContextType>({
  section: {
    outline: [],
  },
  apartmentTemplates: [],
})

interface AppContextType {
  section: {
    outline: APoint[]
  }
  apartmentTemplates: ApartmentTemplate[]
}