import { useStoreMap, useUnit } from 'effector-react'
import { Button } from '../common/Button'
import styles from './SnapControls.module.scss'
import * as events from '../../events'
import { NumberInput } from '../common/inputs'

export const SnapControls: React.FC = () => {
    const snapConfig = useUnit(events.$snapConfig)
    const debugEnabled = useStoreMap({ store: events.$debugConfig, keys: ['drawDebug'], fn: x => x.drawDebug })

    return <div className={styles.container}>
        <Button
            active={debugEnabled}
            title='Переключить визуальную отладку'
            onClick={() => events.toggleDrawDebug()}
        >🐞</Button>
        <Button
            active={snapConfig.enable}
            title='Вкл/выкл привязку'
            onClick={() => events.toggleSnap()}
        >
            🧲
        </Button>
        <Button
            active={snapConfig.enablePoint}
            title='Точки'
            onClick={() => events.toggleSnapPoint()}
        >
            Точки
        </Button>
        <Button
            active={snapConfig.enableLine}
            title='Линии'
            onClick={() => events.toggleSnapLine()}
        >
            Линии
        </Button>
        <Button
            active={snapConfig.enableGrid}
            title='Сетка'
            onClick={() => events.toggleSnapGrid()}
        >
            Сетка
        </Button>
        <NumberInput
            title='Шаг сетки'
            label='Шаг'
            width='50px'
            value={snapConfig.gridStep}
            onChange={x => events.setGridStep(x)}
            step={100}
        />
    </div>
}