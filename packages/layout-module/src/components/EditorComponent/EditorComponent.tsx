import React, { useEffect, useRef } from 'react'
import styles from './EditorComponent.module.scss'
import { EditorProps } from './EditorProps'
import { Editor } from '../../Editor/Editor'

export const EditorComponent: React.FC<EditorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)

  const initEditor = async (container: HTMLDivElement) => {
    const editor = new Editor(container)
    editorRef.current = editor
    editor.init()
    setTimeout(() => editor.setSectionOutline(props.sectionOutline))
    setTimeout(() => editor.zoomToExtents())
  }

  useEffect(() => {
    if (containerRef.current && editorRef.current === null) {
      initEditor(containerRef.current)
    }

    return () => {
      if (!editorRef.current) return
      const editor = editorRef.current
      editorRef.current = null
      editor.dispose()
    }
  }, [])

  return <div ref={containerRef} className={styles.container}></div>
}
