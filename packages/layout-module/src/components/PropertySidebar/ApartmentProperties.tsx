import { ApartmentDto } from '../../entities/ApartmentDto'
import { setApartmentProperties } from '../events'

interface ApartmentPropertiesProps {
    apartments: ApartmentDto[]
}

export const ApartmentProperties: React.FC<ApartmentPropertiesProps> = (props) => {
    const { apartments: selected } = props
    const renderTypeButton = () => {
        const isEuro = selected.map(x => x.properties.isEuro).every(x => x)
        return <input type='checkbox' checked={isEuro} onChange={() => setApartmentProperties({ isEuro: !isEuro })} />
    }

    const renderRoomSelect = (roomCount: number[]) => {
        return <select value={roomCount[0]}
            onChange={e => setApartmentProperties({ bedroomCount: Number(e.target.value) })}>
            <option value='-1'>-</option>
            <option value='0'> Cтудия </option>
            {[1, 2, 3, 4].map(x => (<option key={x} value={x}> {x} - комн </option>))}
        </select>
    }

    return <div>
        <p> Выбрано квартир: {selected.length} </p>
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
