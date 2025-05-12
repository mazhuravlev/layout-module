import { use } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent, deleteSelectedEvent } from './events'
import { AppContext } from '../../AppContext'

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
  return (
    <div>
      <button
        type='button'
        onClick={() => deleteSelectedEvent()}>
        Delete Selected
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
