import { Point } from '../../outline/types'

export interface EditorProps {
  sectionOutline: Point[]
  onError: (error: Error) => void
}
