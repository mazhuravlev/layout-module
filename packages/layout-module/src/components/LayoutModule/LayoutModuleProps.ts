import { ApartmentTemplate, APoint } from '../../Editor/types'

export interface LayoutModuleProps {
  section: {
    outline: APoint[]
  }
  apartmentTemplates: ApartmentTemplate[]
}
