import { useStoreMap } from 'effector-react'
import { sectionSettings, setSectionOffset } from '../events'
import { NumberInput } from '../common/inputs'

export const SectionProperties: React.FC = () => {
    const offset = useStoreMap(sectionSettings, x => x.offset)

    return <div>
        <p>Свойства секции</p>
        <NumberInput
            label='Оффсет, мм'
            step={100}
            value={offset}
            onChange={setSectionOffset}
        />
    </div>
}
