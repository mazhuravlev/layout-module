import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { ToolSidebar } from '../ToolSidebar/ToolSidebar'
import { AppContext } from '../../AppContext'
import { PropertySidebar } from '../PropertySidebar/PropertySidebar'
import { useUnit } from 'effector-react'
import { $selection } from '../events'
import { EditorComponent } from '../EditorComponent/EditorComponent'

export const LayoutModule: React.FC<LayoutModuleProps> = (props) => {
  const _selectedIds = useUnit($selection)

  return (
    <AppContext value={props}>
      <div className={styles.root}>
        <aside className={styles.leftSidebar}>
          <ToolSidebar />
        </aside>
        <div className={styles.main}>
          <header className={styles.header}>Типовой этаж</header>
          <div className={styles.content}>
            <div className={styles.editor}>
              <EditorComponent
                sectionOutline={props.section.outline}
              />
            </div>
            <aside className={styles.rightSidebar}>
              {<PropertySidebar />}
            </aside>
          </div>
        </div>
      </div>
    </AppContext>
  )
}
