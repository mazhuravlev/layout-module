import { WindowDto } from '../../Editor/dto'
import { NumberInput } from '../common/inputs'
import { List } from '../common/List'
import { setWindowProperties } from '../events'

interface WindowPropertiesProps {
    windows: WindowDto[]
}

export const WindowProperties: React.FC<WindowPropertiesProps> = (props) => {
    const { windows } = props

    return <div>
        <p> Выбрано окон: {windows.length} </p>
        <List>
            <li>
                <NumberInput
                    label='Размер, мм'
                    value={windows[0].properties.size}
                    step={100}
                    onChange={size => setWindowProperties({ size })}
                />
            </li>
        </List>
    </div>
}
