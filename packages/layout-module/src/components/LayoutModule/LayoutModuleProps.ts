import { ApartmentTemplate, APoint } from '../../types'

export interface LayoutModuleProps {
  /**
   * Единицы измерения 
   */
  units: 'mm'

  section: {
    outline: APoint[]
  }

  apartmentTemplates: ApartmentTemplate[]
}
