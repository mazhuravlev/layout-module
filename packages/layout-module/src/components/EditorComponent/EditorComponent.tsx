import React, { useEffect, useRef } from 'react'
import styles from './EditorComponent.module.scss'
import { EditorProps } from './EditorProps'
import { Editor } from '../../Editor/Editor'
import { withNullable } from '../../func'
import { StateTypeSchema } from '../../Editor/dtoSchema'
import { Logger } from '../../logger'

const logger = new Logger('EditorComponent')

export const EditorComponent: React.FC<EditorProps> = (_props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)

  const initEditor = async (container: HTMLDivElement) => {
    const editor = new Editor(container)
    editorRef.current = editor
    await Promise.resolve()
      .then(() => editor.init())
      .then(() => {
        withNullable(localStorage.getItem('state'), stateData => {
          const { success, data, error } = StateTypeSchema.safeParse(JSON.parse(stateData))
          if (success && data) {
            editor.restoreState(data)
          } else {
            logger.warn(`parse state failed: ${error.message}`)
          }
        })
      })
  }

  useEffect(() => {
    if (containerRef.current && editorRef.current === null) {
      initEditor(containerRef.current)
    }

    return () => {
      withNullable(editorRef.current, editor => {
        editorRef.current = null
        editor.dispose()
      })
    }
  }, [])

  return <div ref={containerRef} className={styles.container}></div>
}
