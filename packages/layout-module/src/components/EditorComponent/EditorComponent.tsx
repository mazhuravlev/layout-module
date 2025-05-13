import React, { useEffect, useRef } from 'react'
import styles from './EditorComponent.module.scss'
import { EditorProps } from './EditorProps'
import { assertDefined } from '../../func'
import { Editor } from '../../Editor/Editor'

export const EditorComponent: React.FC<EditorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const initPromiseRef = useRef<Promise<void> | null>(null)

  const initEditor = async (container: HTMLDivElement) => {
    console.log('initEditor')
    const editor = new Editor(container)
    editorRef.current = editor
    initPromiseRef.current = editor.init()
      .then(() => editor.setSectionOutline(props.sectionOutline))
      .then(() => editor.zoomToExtents())
      .then(() => props.setEditor(editor))
      .catch((error) => props.onError(error))
  }

  useEffect(() => {
    if (containerRef.current && editorRef.current === null) {
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
        props.setEditor(null)
      })
    }
  }, [containerRef.current])

  return <div ref={containerRef} className={styles.container}></div>
}
