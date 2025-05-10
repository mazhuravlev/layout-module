import { EditorComponent } from '../Editor/EditorComponent'
import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { AppContext } from './AppContext'
import { ToolSidebar } from '../ToolSidebar/ToolSidebar'
import { ApartmentShape } from '../../outline/types'

export const LayoutModule: React.FC<LayoutModuleProps> = (props) => {
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
              <EditorComponent sectionOutline={props.section.outline} />
            </main>
            <aside className={styles.rightSidebar}>Right Sidebar</aside>
          </div>
        </div>
      </div>
    </AppContext>
  )
}
