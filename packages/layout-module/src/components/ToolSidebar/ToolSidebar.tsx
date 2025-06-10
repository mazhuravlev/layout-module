import { ToolSidebarProps } from './ToolSidebarProps'
import * as events from '../../events'
import styles from './ToolSidebar.module.scss'
import { Button } from '../common/Button'
import { useStoreMap, useUnit } from 'effector-react'
import { ApartmentTemplateComponent } from './ApartmentTemplateComponent'
import { NumberInput } from '../common/inputs'

export const ToolSidebar: React.FC<ToolSidebarProps> = props => {
  const debugEnabled = useStoreMap({ store: events.$debugConfig, keys: ['drawDebug'], fn: x => x.drawDebug })
  const snapConfig = useUnit(events.$snapConfig)
  const sizeConfig = useUnit(events.$sizeConfig)

  return (
    <div className={styles.container}>
      <div>
        <Button
          title='Отменить'
          onClick={() => events.undo()}>
          ↩️
        </Button>
        <Button
          title='Повторить'
          onClick={() => events.redo()}>
          ↪️
        </Button>
        <Button
          title='Показать всё'
          onClick={() => events.zoomToExtents()}>
          🔎
        </Button>
        <Button
          title='Удалить выбранное'
          onClick={() => events.deleteSelected()}>
          🗑️
        </Button>
        <Button
          active={snapConfig.enable}
          title='Вкл/выкл привязку'
          onClick={() => events.toggleSnap()}
        >🧲</Button>
        <Button
          active={sizeConfig.showWallSize}
          title='Вкл/выкл размеры'
          onClick={() => events.toggleShowWallSize()}
        >📏</Button>
        <Button
          title='Повернуть выбранные'
          onClick={() => events.rotateSelected(90)}
        >🔄</Button>
        <Button
          title='Отразить по горизонтали'
          onClick={() => events.flipSelected('horizontal')}
        >↔️</Button>
        <Button
          title='Отразить по вертикали'
          onClick={() => events.flipSelected('vertical')}
        >↕️</Button>
        <Button
          active={debugEnabled}
          title='Toggle visual debug'
          onClick={() => events.toggleDrawDebug()}
        >Debug</Button>
      </div>
      <div className={styles.toolBlock}>
        <div><Button
          active={snapConfig.enableGrid}
          title='Сетка'
          onClick={() => events.toggleSnapGrid()}
        >Сетка</Button>
          <Button
            active={snapConfig.enablePoint}
            title='Точки'
            onClick={() => events.toggleSnapPoint()}
          >Точки</Button>
          <Button
            active={snapConfig.enableLine}
            title='Линии'
            onClick={() => events.toggleSnapLine()}
          >Линии</Button>
        </div>

        <div style={{ marginTop: 8 }}>
          <NumberInput
            label='Шаг сетки, мм'
            step={100}
            value={snapConfig.gridStep}
            onChange={events.setGridStep}
          />
        </div>
      </div>

      <ul className={styles.apartmentTemplates}>
        {props.apartmentTemplates.map((template) => (
          <li
            key={template.name}
            onClick={() => events.addApartment(template)}>
            <ApartmentTemplateComponent template={template} />
          </li>
        ))}
      </ul>
      <ul>
        <li
          onClick={() => events.addLLU()}>
          ЛЛУ
        </li>
      </ul>
    </div>
  )
}
