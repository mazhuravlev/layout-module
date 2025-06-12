import { Button } from '../common/Button'
import rotateImg from './rotate.png'
import zoomImg from './zoom.png'
import flipVerticalImg from './flipVertical.png'
import flipHorizontalImg from './flipHorizontal.png'
import * as events from '../../events'
import { useUnit } from 'effector-react'

const buttonStyle = { padding: 0 }

export const EditorButtons: React.FC = () => {
    const sizeConfig = useUnit(events.$sizeConfig)


    const buttons = [
        {
            active: true,
            img: flipVerticalImg,
            fn: () => events.flipSelected('vertical'),
        },
        {
            active: true,
            img: flipHorizontalImg,
            fn: () => events.flipSelected('horizontal'),
        },
        {
            active: true,
            img: rotateImg,
            fn: () => events.rotateSelected(90),
        },
        {
            active: true,
            img: zoomImg,
            fn: () => events.zoomToExtents(),
        },
        {
            active: sizeConfig.showWallSize,
            title: 'Вкл/выкл размеры',
            fn: () => events.toggleShowWallSize(),
            children: '📏',
            style: { padding: '4px' },
        },
    ]
    return <>
        {buttons.map(({ active, img, fn, children, title, style }) =>
            <Button
                active={active}
                key={img ?? children}
                title={title}
                onClick={fn}
                style={{ ...buttonStyle, ...style }}>
                {img && <img src={img} />}
                {children}
            </Button>)}
    </>
}
