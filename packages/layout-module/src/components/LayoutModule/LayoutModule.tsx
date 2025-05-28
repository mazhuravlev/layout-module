import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { ToolSidebar } from '../ToolSidebar/ToolSidebar'
import { PropertySidebar } from '../PropertySidebar/PropertySidebar'
import { EditorComponent } from '../EditorComponent/EditorComponent'

const sectionOutline = [
  { x: 0, y: 0 },
  { x: 0, y: 18000 },
  { x: 36000, y: 18000 },
  { x: 36000, y: 0 },
]

export const LayoutModule: React.FC<LayoutModuleProps> = (props) => {
  return (
    <div className={styles.root}>
      <aside className={styles.leftSidebar}>
        <ToolSidebar apartmentTemplates={props.apartmentTemplates} />
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>Типовой этаж</header>
        <div className={styles.content}>
          <div className={styles.editor}>
            <EditorComponent
              sectionOutline={sectionOutline}
            />
          </div>
          <aside className={styles.rightSidebar}>
            {<PropertySidebar />}
          </aside>
        </div>
      </div>
    </div>
  )
}
