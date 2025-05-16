import { use, useEffect } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent, $debugConfig, deleteSelectedEvent, $snapConfig, toggleDrawDebug, toggleSnap, zoomToExtentsEvent, toggleSnapGrid, toggleSnapPoint, toggleSnapLine } from '../events'
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

  return (
    <div className={styles.container}>
      <div>
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
      <div>
        <div>Привязки</div>
        <Button
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
