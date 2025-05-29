import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { ToolSidebar } from '../ToolSidebar/ToolSidebar'
import { PropertySidebar } from '../PropertySidebar/PropertySidebar'
import { EditorComponent } from '../EditorComponent/EditorComponent'
import { useStoreMap } from 'effector-react'
import { $section } from '../events'
import { SectionsComponent } from '../ToolSidebar/SectionsComponent'

export const LayoutModule: React.FC<LayoutModuleProps> = (props) => {
  const sectionOutlineSelected = useStoreMap($section, x => x.outlineSelected)

  const renderSidebar = () => {
    if (sectionOutlineSelected) {
      return <ToolSidebar apartmentTemplates={props.apartmentTemplates} />
    } else {
      return <SectionsComponent />
    }
  }

  return (
    <div className={styles.root}>
      <aside className={styles.leftSidebar}>
        {renderSidebar()}
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>Типовой этаж</header>
        <div className={styles.content}>
          <div className={styles.editor}>
            <EditorComponent />
          </div>
          <aside className={styles.rightSidebar}>
            {<PropertySidebar />}
          </aside>
        </div>
      </div>
    </div>
  )
}
