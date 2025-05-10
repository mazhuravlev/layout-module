import React, { useEffect, useRef } from 'react'
import styles from './Editor.module.scss'
import { EditorProps } from './EditorProps'
import { assertDefined } from '../../func'
import { Editor } from './Editor'

export const EditorComponent: React.FC<EditorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const initPromiseRef = useRef<Promise<void> | null>(null)

  const initEditor = async (container: HTMLDivElement) => {
    const editor = new Editor(container)
    editorRef.current = editor
    initPromiseRef.current = editor.init()
  }

  useEffect(() => {
    if (containerRef.current) {
      initEditor(containerRef.current)
    }
    return () => {
      if (!editorRef.current) return
      const editor = editorRef.current
      editorRef.current = null
      const initPromise = assertDefined(initPromiseRef.current)
      initPromiseRef.current = null
      assertDefined(initPromise).then(() => {
        editor.dispose()
      })
    }
  }, [containerRef.current])

  return <div ref={containerRef} className={styles.container}></div>
}
