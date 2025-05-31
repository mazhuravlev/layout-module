import { useUnit } from 'effector-react'
import { $selectedObjects } from '../events'
import styles from './PropertySidebar.module.scss'
import { ApartmentProperties } from './ApartmentProperties'
import { SectionProperties } from './SectionProperties'
import { WindowProperties } from './WindowProperties'
import { areAllApartments, areAllWindows } from '../../Editor/dto'
import { empty } from '../../func'

export const PropertySidebar: React.FC = () => {
    const selectedObjects = useUnit($selectedObjects)

    const renderContent = () => {
        if (empty(selectedObjects)) return <SectionProperties />
        if (areAllApartments(selectedObjects)) return <ApartmentProperties apartments={selectedObjects} />
        if (areAllWindows(selectedObjects)) return <WindowProperties windows={selectedObjects} />
        return <SectionProperties />
    }

    return <div className={styles.container}>
        {renderContent()}
    </div>
}
