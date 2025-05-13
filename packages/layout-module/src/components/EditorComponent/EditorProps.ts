import { Editor } from "../../Editor/Editor"
import { PointLike } from "../../types"

export interface EditorProps {
  sectionOutline: PointLike[]
  onError: (error: Error) => void
  setEditor: React.Dispatch<React.SetStateAction<Editor | null>>
}
