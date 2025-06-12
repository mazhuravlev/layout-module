import React, { useEffect } from 'react'
import styles from './LayoutModule.module.scss'
import type { LayoutModuleProps } from './LayoutModuleProps'
import { PropertySidebar } from '../PropertySidebar/PropertySidebar'
import { AppContextProvider } from '../AppContextProvider'
import { DataAccess } from '../../DataAccess/DataAccess'
import { EditorComponent } from '../EditorComponent/EditorComponent'
import { Sidebar } from '../Sidebar/Sidebar'
import { EditorButtons } from '../EditorButtons/EditorButtons'
import { fromEvent } from 'rxjs'
import * as events from '../../events'
import { useUnit } from 'effector-react'
import type { FloorType } from '../../types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SnapControls } from '../SnapControls/SnapControls'

const queryClient = new QueryClient()
const dataAccess = new DataAccess()

const keyMap = [
  { code: 'KeyC', ctrl: true, fn: () => events.copySelected() },
  { code: 'KeyV', ctrl: true, fn: () => events.pasteObjects() },
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
  const editorState = useUnit(events.$editorState)

  useEffect(() => {
    const s = fromEvent<KeyboardEvent>(document, 'keydown', { passive: false })
      .subscribe(e => {
        const r = keyMap.find(x => x.code === e.code)
        if (r && (Boolean(r.ctrl) === e.ctrlKey)) {
          r.fn()
          if (r.preventDefault) e.preventDefault()
        }
      })
    return () => s.unsubscribe()
  }, [])

  function renderHeader(floorType: FloorType): React.ReactNode {
    const renderStyle = (x: FloorType) =>
      floorType === x ? { color: '#24B3F2' } : { cursor: 'pointer' }
    return (<header className={styles.header}>
      {editorState.ready && <header>
        <a
          onClick={() => events.selectFloorType('first')}
          style={renderStyle('first')}>
          Первый этаж
        </a>
        &nbsp;/&nbsp;
        <a
          onClick={() => events.selectFloorType('typical')}
          style={renderStyle('typical')}>
          Типовой этаж
        </a>
        &nbsp;| X-Ray</header>}
    </header>)
  }

  return (
    <AppContextProvider dataAccess={dataAccess}>
      <QueryClientProvider client={queryClient}>
        <div className={styles.root}>
          <aside className={styles.leftSidebar}>
            <Sidebar />
          </aside>
          <div className={styles.main}>
            {renderHeader(editorState.floorType)}
            <div className={styles.content}>
              <div className={styles.editor}>
                {editorState.ready && <>
                  <div className={styles.editorButtons}>
                    <EditorButtons />
                  </div>
                  <div className={styles.snapControls}>
                    <SnapControls />
                  </div>
                </>}
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

