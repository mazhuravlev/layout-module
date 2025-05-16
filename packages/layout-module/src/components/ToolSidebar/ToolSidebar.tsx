import { use, useEffect } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent, $debugConfig, deleteSelectedEvent, $snapConfig, toggleDrawDebug, toggleSnap, zoomToExtentsEvent } from '../events'
import { AppContext } from '../../AppContext'
import styles from './ToolSidebar.module.scss'
import { Button } from '../Button/Button'
import { useStoreMap } from 'effector-react'
import { filter, fromEvent } from 'rxjs'

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
  const debugEnabled = useStoreMap({ store: $debugConfig, keys: ['drawDebug'], fn: x => x.drawDebug })
  const snapEnabled = useStoreMap({ store: $snapConfig, keys: ['snap'], fn: x => x.snap })
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
          active={snapEnabled}
          title='Вкл/выкл привязку'
          onClick={() => toggleSnap()}
        >🧲</Button>
        <Button
          active={debugEnabled}
          title='Toggle visual debug'
          onClick={() => toggleDrawDebug()}
        >Debug</Button>
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
