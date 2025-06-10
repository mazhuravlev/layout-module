import { Button } from '../common/Button'
import rotateImg from './rotate.png'
import zoomImg from './zoom.png'
import flipVerticalImg from './flipVertical.png'
import flipHorizontalImg from './flipHorizontal.png'
import * as events from '../../events'

const buttonStyle = { padding: 0 }

export const EditorButtons: React.FC = () => {
    const buttons = [
        {
            img: flipVerticalImg,
            fn: () => events.flipSelected('vertical'),
        },
        {
            img: flipHorizontalImg,
            fn: () => events.flipSelected('horizontal'),
        },
        {
            img: rotateImg,
            fn: () => events.rotateSelected(90),
        },
        {
            img: zoomImg,
            fn: () => events.zoomToExtents(),
        },
    ]
    return <>
        {buttons.map(({ img, fn }) =>
            <Button
                key={img}
                onClick={fn}
                style={buttonStyle}>
                <img src={img} />
            </Button>)}
    </>
}