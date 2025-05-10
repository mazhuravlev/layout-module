import { createContext } from 'react'
import { LayoutModuleProps } from './LayoutModuleProps'

export const AppContext = createContext<LayoutModuleProps>({
  section: {
    outline: [],
  },
  apartmentTemplates: [],
})
