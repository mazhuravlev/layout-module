import { EditorComponent } from '../EditorComponent/EditorComponent'
import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { ToolSidebar } from '../ToolSidebar/ToolSidebar'
import { useState } from 'react'
import { AppContext } from '../../AppContext'

export const LayoutModule: React.FC<LayoutModuleProps> = (props) => {
  const [editorError, setEditorError] = useState<Error | null>(null)

  return (
    <AppContext value={props}>
      <div className={styles.root}>
        <aside className={styles.leftSidebar}>
          <ToolSidebar />
        </aside>
        <div className={styles.main}>
          <header className={styles.header}>Header test</header>
          <div className={styles.content}>
            <main className={styles.editor}>
              {!editorError && <EditorComponent
                sectionOutline={props.section.outline}
                onError={(error) => setEditorError(error)}
              />
              }
              {editorError && <div className={styles.error}>{editorError.message}</div>}
            </main>
            <aside className={styles.rightSidebar}>Sidebar</aside>
          </div>
        </div>
      </div>
    </AppContext>
  )
}
