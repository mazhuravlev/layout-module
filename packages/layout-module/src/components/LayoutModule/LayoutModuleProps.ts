import { ApartmentTemplate, APoint } from '../../types'

export interface LayoutModuleProps {
  section: {
    outline: APoint[]
  }
  apartmentTemplates: ApartmentTemplate[]
}
