import { createContext } from 'react'
import { ApartmentTemplate, PointLike } from './types'

export const AppContext = createContext<AppContextType>({
  section: {
    outline: [],
  },
  apartmentTemplates: [],
})

interface AppContextType {
  section: {
    outline: PointLike[]
  }
  apartmentTemplates: ApartmentTemplate[]
}