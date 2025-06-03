import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { ToolSidebar } from '../ToolSidebar/ToolSidebar'
import { PropertySidebar } from '../PropertySidebar/PropertySidebar'
import { useStoreMap } from 'effector-react'
import { $section } from '../events'
import { SectionsComponent } from '../ToolSidebar/SectionsComponent'
import { AppContextProvider } from '../AppContext'
import { DataAccess } from '../../dataAccess/DataAccess'
import { EditorComponent } from '../EditorComponent/EditorComponent'
import { isNull } from '../../func'
import { LayoutsComponent } from '../ToolSidebar/LayoutsComponent'
import { SectionDto } from '../../dataAccess/types'

const queryClient = new QueryClient()
const dataAccess = new DataAccess()

export const LayoutModule: React.FC<LayoutModuleProps> = (props) => {
  const sectionId = useStoreMap($section, x => x.id)
  const [selectedSection, setSelectedSection] = useState<SectionDto | null>(null)

  const renderSidebar = () => {
    if (sectionId) {
      return <ToolSidebar apartmentTemplates={props.apartmentTemplates} />
    } else if (isNull(selectedSection)) {
      return <SectionsComponent onSelectSection={x => setSelectedSection(x)} />
    } else {
      return <LayoutsComponent section={selectedSection} />
    }
  }

  return (
    <AppContextProvider dataAccess={dataAccess}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </AppContextProvider>
  )
}
