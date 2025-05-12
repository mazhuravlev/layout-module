import { use } from 'react'
import { ToolSidebarProps } from './ToolSidebarProps'
import { addApartmentEvent } from './events'
import { AppContext } from '../../AppContext'

export const ToolSidebar: React.FC<ToolSidebarProps> = () => {
  const context = use(AppContext)
  return (
    <div>
      <ul>
        {context.apartmentTemplates.map((template, index) => (
          <li key={index} onClick={() => addApartmentEvent(template)}>
            {template.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
