import { createContext } from 'react'
import { LayoutModuleProps } from './components/LayoutModule/LayoutModuleProps'
import { ApartmentShape, Point } from './outline/types'

export const AppContext = createContext<LayoutModuleProps>({
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