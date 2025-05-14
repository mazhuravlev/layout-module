import { use } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent, deleteSelectedEvent, zoomToExtentsEvent } from '../events'
import { AppContext } from '../../AppContext'
import styles from './ToolSidebar.module.scss'
import { Button } from '../Button/Button'

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
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
