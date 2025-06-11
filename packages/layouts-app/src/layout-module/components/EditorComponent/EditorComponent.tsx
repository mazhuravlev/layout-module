import React, { useEffect, useRef, useCallback } from 'react'
import styles from './EditorComponent.module.scss'
import type { EditorProps } from './EditorProps'
import { Editor } from '../../Editor/Editor'
import { withNullable } from '../../func'
import { useDataAccess } from '../hooks'
import { $savedSelectedLayout, loadLayout } from '../../events'

export const EditorComponent: React.FC<EditorProps> = (_props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const dataAccess = useDataAccess()

  const initEditor = useCallback(async (container: HTMLDivElement) => {
    const editor = new Editor(container, dataAccess)
    editorRef.current = editor
    await Promise.resolve()
      .then(() => editor.init())
      .then(() => {
        withNullable(
          $savedSelectedLayout.getState(),
          s => loadLayout(s))
      })
  }, [dataAccess])

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
  }, [initEditor])

  return <div ref={containerRef} className={styles.container}></div>
}
