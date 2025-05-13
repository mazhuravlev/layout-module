import { EditorComponent } from '../EditorComponent/EditorComponent'
import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { ToolSidebar } from '../ToolSidebar/ToolSidebar'
import { useState } from 'react'
import { AppContext } from '../../AppContext'
import { PropertySidebar } from '../PropertySidebar/PropertySidebar'
import { useUnit } from 'effector-react'
import { selectionStore } from '../events'
import { Editor } from '../../Editor/Editor'

export const LayoutModule: React.FC<LayoutModuleProps> = (props) => {
  const [editorError, setEditorError] = useState<Error | null>(null)
  const selectedIds = useUnit(selectionStore)
  const [editor, setEditor] = useState<Editor | null>(null)

  return (
    <AppContext value={props}>
      <div className={styles.root}>
        <aside className={styles.leftSidebar}>
          <ToolSidebar />
        </aside>
        <div className={styles.main}>
          <header className={styles.header}>Header</header>
          <div className={styles.content}>
            <main className={styles.editor}>
              {!editorError && <EditorComponent
                sectionOutline={props.section.outline}
                setEditor={setEditor}
                onError={(error) => setEditorError(error)}
              />
              }
              {editorError && <div className={styles.error}>{editorError.message}</div>}
            </main>
            <aside className={styles.rightSidebar}>
              {editor && selectedIds.length && <PropertySidebar />}
            </aside>
          </div>
        </div>
      </div>
    </AppContext>
  )
}
