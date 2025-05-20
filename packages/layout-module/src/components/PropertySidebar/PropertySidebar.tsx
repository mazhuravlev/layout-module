import { useUnit } from 'effector-react'
import { $selectedApartments, setApartmentProperties } from '../events'
import styles from './PropertySidebar.module.scss'

export const PropertySidebar: React.FC = () => {
    const selected = useUnit($selectedApartments)
    if (selected.length === 0) return null

    const renderTypeButton = () => {
        const isEuro = selected.map(x => x.properties.isEuro).every(x => x)
        return <input type='checkbox' checked={isEuro} onChange={() => setApartmentProperties({ isEuro: !isEuro })} />
    }

    const renderRoomSelect = (roomCount: number[]) => {
        return <select value={roomCount[0]}
            onChange={e => setApartmentProperties({ bedroomCount: Number(e.target.value) })}>
            <option value='-1'>-</option>
            <option value='0'>Cтудия</option>
            {[1, 2, 3, 4].map(x => (<option key={x} value={x}>{x}-комн</option>))}
        </select>
    }

    return <div className={styles.container}>
        <div>Свойства</div>
        <p>Выбрано квартир: {selected.length}</p>
        <ol>
            <li>
                Евро {renderTypeButton()}
            </li>
            <li>
                {renderRoomSelect(selected.map(x => x.properties.bedroomCount))}
            </li>
        </ol>
    </div>
}
