import { use, useEffect } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartment, $debugConfig, deleteSelected, $snapConfig, toggleDrawDebug, toggleSnap, zoomToExtents, toggleSnapGrid, toggleSnapPoint, toggleSnapLine, setGridStep, undo, redo, addLLU, rotateSelected, toggleShowWallSize, $sizeConfig } from '../events'
import { AppContext } from '../../AppContext'
import styles from './ToolSidebar.module.scss'
import { Button } from '../Button/Button'
import { useStoreMap, useUnit } from 'effector-react'
import { fromEvent } from 'rxjs'
import { ApartmentTemplateComponent } from './ApartmentTemplateComponent'

const keyMap = [
  { code: 'Delete', fn: () => deleteSelected() },
  { code: 'KeyA', fn: () => toggleShowWallSize() },
  { code: 'KeyS', fn: () => toggleSnap() },
  { code: 'KeyD', fn: () => toggleDrawDebug() },
  { code: 'KeyQ', fn: () => toggleSnapGrid() },
  { code: 'KeyW', fn: () => toggleSnapPoint() },
  { code: 'KeyE', fn: () => toggleSnapLine() },
  { code: 'KeyZ', ctrl: true, preventDefault: true, fn: () => undo() },
  { code: 'KeyR', ctrl: true, preventDefault: true, fn: () => redo() },
]

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
  const debugEnabled = useStoreMap({ store: $debugConfig, keys: ['drawDebug'], fn: x => x.drawDebug })
  const snapConfig = useUnit($snapConfig)
  const sizeConfig = useUnit($sizeConfig)
  const { apartmentTemplates } = context

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
    <div className={styles.container}>
      <div>
        <Button
          title='Отменить'
          onClick={() => undo()}>
          ↩️
        </Button>
        <Button
          title='Повторить'
          onClick={() => redo()}>
          ↪️
        </Button>
        <Button
          title='Показать всё'
          onClick={() => zoomToExtents()}>
          🔎
        </Button>
        <Button
          title='Удалить выбранное'
          onClick={() => deleteSelected()}>
          🗑️
        </Button>
        <Button
          active={snapConfig.enable}
          title='Вкл/выкл привязку'
          onClick={() => toggleSnap()}
        >🧲</Button>
        <Button
          active={sizeConfig.showWallSize}
          title='Вкл/выкл размеры'
          onClick={() => toggleShowWallSize()}
        >📏</Button>
        <Button
          title='Повернуть выбранные'
          onClick={() => rotateSelected()}
        >⤸</Button>
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
          <label>Шаг сетки, мм
            <input type='number'
              style={{ width: 50, marginLeft: 8, border: 'none' }}
              value={snapConfig.gridStep}
              size={4}
              onChange={e => setGridStep(Number(e.target.value))} />
          </label>
        </div>
      </div>
      <ul className={styles.apartmentTemplates}>
        {apartmentTemplates.map((template) => (
          <li
            key={template.name}
            onClick={() => addApartment(template)}>
            <ApartmentTemplateComponent template={template} />
          </li>
        ))}
      </ul>
      <ul>
        <li
          onClick={() => addLLU()}>
          ЛЛУ
        </li>
      </ul>
    </div>
  )
}
