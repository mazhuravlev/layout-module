import { use } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent, deleteSelectedEvent } from '../events'
import { AppContext } from '../../AppContext'
import styles from './ToolSidebar.module.scss'

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
  return (
    <div className={styles.container}>
      <button
        type='button'
        title='Удалить выбранное'
        onClick={() => deleteSelectedEvent()}>
        🗑️
      </button>
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
