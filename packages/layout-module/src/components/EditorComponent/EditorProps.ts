import { PointLike } from "../../types"

export interface EditorProps {
  sectionOutline: PointLike[]
  onError: (error: Error) => void
}
