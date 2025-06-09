import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import styles from './LayoutModule.module.scss'
import { LayoutModuleProps } from './LayoutModuleProps'
import { PropertySidebar } from '../PropertySidebar/PropertySidebar'
import { AppContextProvider } from '../AppContext'
import { DataAccess } from '../../dataAccess/DataAccess'
import { EditorComponent } from '../EditorComponent/EditorComponent'
import { Sidebar } from '../Sidebar/Sidebar'
import { EditorButtons } from '../EditorButtons/EditorButtons'
import { fromEvent } from 'rxjs'
import * as events from '../events'

const queryClient = new QueryClient()
const dataAccess = new DataAccess()

const keyMap = [
  { code: 'Delete', fn: () => events.deleteSelected() },
  { code: 'KeyA', fn: () => events.toggleShowWallSize() },
  { code: 'KeyS', fn: () => events.toggleSnap() },
  { code: 'KeyD', fn: () => events.toggleDrawDebug() },
  { code: 'KeyQ', fn: () => events.toggleSnapGrid() },
  { code: 'KeyW', fn: () => events.toggleSnapPoint() },
  { code: 'KeyE', fn: () => events.toggleSnapLine() },
  { code: 'KeyZ', ctrl: true, preventDefault: true, fn: () => events.undo() },
  { code: 'KeyR', ctrl: true, preventDefault: true, fn: () => events.redo() },
]

export const LayoutModule: React.FC<LayoutModuleProps> = (_props) => {
  useEffect(() => {
    const s = fromEvent<KeyboardEvent>(document, 'keydown', { passive: false })
      .subscribe(e => {
        const r = keyMap.find(x => x.code === e.code)
        if (r && !!r.ctrl === e.ctrlKey) {
          r.fn()
          if (r.preventDefault) e.preventDefault()
        }
      })
    return () => s.unsubscribe()
  }, [])

  return (
    <AppContextProvider dataAccess={dataAccess}>
      <QueryClientProvider client={queryClient}>
        <div className={styles.root}>
          <aside className={styles.leftSidebar}>
            <Sidebar />
          </aside>
          <div className={styles.main}>
            <header className={styles.header}>
              <a style={{ color: '#24B3F2' }}>Первый этаж</a>&nbsp;/ Типовой этаж | X-Ray
            </header>
            <div className={styles.content}>
              <div className={styles.editor}>
                <div className={styles.editorButtons}>
                  <EditorButtons />
                </div>
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

