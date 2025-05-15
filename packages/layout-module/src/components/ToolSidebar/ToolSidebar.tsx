import { use } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent, debugStore, deleteSelectedEvent, toggleDrawDebugEvent, zoomToExtentsEvent } from '../events'
import { AppContext } from '../../AppContext'
import styles from './ToolSidebar.module.scss'
import { Button } from '../Button/Button'
import { useStoreMap } from 'effector-react'

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
  const debugEnabled = useStoreMap({ store: debugStore, keys: ['drawDebug'], fn: x => x.drawDebug })

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
          active={debugEnabled}
          title='Toggle visual debug'
          onClick={() => toggleDrawDebugEvent()}
        >Debug</Button>
      </div>
      <ul>
        {context.apartmentTemplates.map((template) => (
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
