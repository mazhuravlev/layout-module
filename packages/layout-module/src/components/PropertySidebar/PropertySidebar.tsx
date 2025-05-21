import { useUnit } from 'effector-react'
import { $selectedApartments } from '../events'
import styles from './PropertySidebar.module.scss'
import { ApartmentProperties } from './ApartmentProperties'
import { SectionProperties } from './SectionProperties'

export const PropertySidebar: React.FC = () => {
    const selectedApartments = useUnit($selectedApartments)

    return <div className={styles.container}>
        {selectedApartments.length ? <ApartmentProperties apartments={selectedApartments} /> : <SectionProperties />}
    </div>
}

