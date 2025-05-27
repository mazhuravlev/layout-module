import { Button } from '../common/Button'
import { populateWindows } from '../events'
import { List } from '../common/List'
import { NumberInput } from '../common/inputs'
import { useState } from 'react'

export const PopulateWindows: React.FC = () => {
    const [windowSize, setWindowSize] = useState(1800)
    const [spacing, setSpacing] = useState(3000)
    return <div>
        <List>
            <li>
                <NumberInput
                    label='Ширина, мм'
                    step={100}
                    width={100}
                    value={windowSize}
                    onChange={setWindowSize}
                />
            </li>
            <li>
                <NumberInput
                    label='Интервал, мм'
                    step={100}
                    width={100}
                    value={spacing}
                    onChange={setSpacing}
                />
            </li>
        </List>
        <Button
            title='Добавить окна'
            onClick={() => populateWindows({ windowSize, spacing })}
        >Добавить окна</Button>
    </div>
}