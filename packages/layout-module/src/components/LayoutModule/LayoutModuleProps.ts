import { ApartmentTemplate, PointLike } from "../../types"

export interface LayoutModuleProps {
  section: {
    outline: PointLike[]
  }
  apartmentTemplates: ApartmentTemplate[]
}
