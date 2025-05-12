import { createContext } from 'react'
import { ApartmentShape, Point } from './outline/types'

export const AppContext = createContext<AppContextType>({
  section: {
    outline: [],
  },
  apartmentTemplates: [],
})

interface AppContextType {
  section: {
    outline: Point[]
  }
  apartmentTemplates: ApartmentShape[]
}