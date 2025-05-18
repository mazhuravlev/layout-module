import { use, useEffect } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent, $debugConfig, deleteSelectedEvent, $snapConfig, toggleDrawDebug, toggleSnap, zoomToExtentsEvent, toggleSnapGrid, toggleSnapPoint, toggleSnapLine, setGridStep, undoEvent, redoEvent } from '../events'
import { AppContext } from '../../AppContext'
import styles from './ToolSidebar.module.scss'
import { Button } from '../Button/Button'
import { useStoreMap, useUnit } from 'effector-react'
import { filter, fromEvent } from 'rxjs'

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
  const debugEnabled = useStoreMap({ store: $debugConfig, keys: ['drawDebug'], fn: x => x.drawDebug })
  const snapConfig = useUnit($snapConfig)
  const { apartmentTemplates } = context

  useEffect(() => {
    const s = fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.code.startsWith('Digit')))
      .subscribe(e => {
        const t = apartmentTemplates[Number(e.key) - 1]
        if (t) addApartmentEvent(t)
      })
    return () => s.unsubscribe()
  }, apartmentTemplates)

  useEffect(() => {
    const s = fromEvent<KeyboardEvent>(document, 'keydown', { passive: false })
      .pipe(filter(e => e.ctrlKey))
      .subscribe(e => {
        switch (e.code) {
          case 'KeyZ':
            undoEvent()
            break
          case 'KeyR':
            e.preventDefault()
            redoEvent()
            break
        }
      })
    return () => s.unsubscribe()
  }, [])

  useEffect(() => {
    const s = fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .subscribe(e => {
        switch (e.code) {
          case 'KeyQ':
            setGridStep(snapConfig.gridStep + 10)
            break
          case 'KeyA':
            setGridStep(snapConfig.gridStep - 10)
            break
          case 'KeyW':
            toggleSnapGrid()
            break
          case 'KeyE':
            toggleSnapPoint()
            break
          case 'KeyR':
            toggleSnapLine()
            break
          case 'KeyS':
            toggleSnap()
            break
        }
      })
    return () => s.unsubscribe()
  }, [])

  return (
    <div className={styles.container}>
      <div>
        <Button
          title='Отменить'
          onClick={() => undoEvent()}>
          ↩️
        </Button>
        <Button
          title='Повторить'
          onClick={() => redoEvent()}>
          ↪️
        </Button>
        <Button
          title='Показать всё'
          onClick={() => zoomToExtentsEvent()}>
          🔎
        </Button>
        <Button
          title='Удалить выбранное'
          onClick={() => deleteSelectedEvent()}>
          🗑️
        </Button>
        <Button
          active={snapConfig.enable}
          title='Вкл/выкл привязку'
          onClick={() => toggleSnap()}
        >🧲</Button>
        <Button
          active={debugEnabled}
          title='Toggle visual debug'
          onClick={() => toggleDrawDebug()}
        >Debug</Button>
      </div>
      <div style={{ marginTop: 8, padding: 4, borderLeft: '1px solid lightgrey' }}>
        <div><Button
          active={snapConfig.enableGrid}
          title='Сетка'
          onClick={() => toggleSnapGrid()}
        >Сетка</Button>
          <Button
            active={snapConfig.enablePoint}
            title='Точки'
            onClick={() => toggleSnapPoint()}
          >Точки</Button>
          <Button
            active={snapConfig.enableLine}
            title='Линии'
            onClick={() => toggleSnapLine()}
          >Линии</Button>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Шаг сетки
            <input type='number'
              style={{ width: 50, marginLeft: 8, border: 'none' }}
              value={snapConfig.gridStep}
              size={4}
              onChange={e => setGridStep(Number(e.target.value))} />
          </label>
        </div>
      </div>
      <ul>
        {apartmentTemplates.map((template) => (
          <li
            key={template.name}
            onClick={() => addApartmentEvent(template)}>
            {template.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
