import { ApartmentShape, Point } from '../../outline/types'

export interface LayoutModuleProps {
  section: {
    outline: Point[]
  }
  apartmentTemplates: ApartmentShape[]
}
