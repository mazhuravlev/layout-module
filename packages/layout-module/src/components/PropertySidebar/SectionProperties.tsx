import { useStoreMap } from 'effector-react'
import { sectionSettings, setSectionOffset } from '../events'

export const SectionProperties: React.FC = () => {
    const offset = useStoreMap(sectionSettings, x => x.offset)

    return <div>
        <p>Свойства секции</p>
        <label>Офсет, мм<input type='number'
            value={offset}
            onChange={e => setSectionOffset(Number(e.target.value))} />
        </label>
    </div>
}
