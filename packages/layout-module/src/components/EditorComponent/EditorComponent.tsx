import React, { useEffect, useRef } from 'react'
import styles from './EditorComponent.module.scss'
import { EditorProps } from './EditorProps'
import { Editor } from '../../Editor/Editor'
import { withNullable } from '../../func'
import { Logger } from '../../logger'
import { useDataAccess } from '../hooks'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logger = new Logger('EditorComponent')

export const EditorComponent: React.FC<EditorProps> = (_props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const dataAccess = useDataAccess()

  const initEditor = async (container: HTMLDivElement) => {
    const editor = new Editor(container, dataAccess)
    editorRef.current = editor
    await Promise.resolve()
      .then(() => editor.init())
      .then(async () => {
        withNullable(await dataAccess.loadCurrentDocument(), d => editor.loadDocument(d))
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
