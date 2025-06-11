import { useState } from 'react'
import { Button } from '../common/Button'
import { Sections } from '../Sections/Sections'
import styles from './Sidebar.module.scss'
import { Layouts } from '../Layouts/Layouts'

export const Sidebar: React.FC = () => {
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

    return <div className={styles.container}>
        <div className={styles.modeSwitch}>
            <span>Задание</span>
            <span style={{ fontWeight: 600 }}>Редактирование</span>
        </div>
        <div className={styles.layouts}>
            <header>Секции</header>
            <div>
                <Sections onSelectSection={setSelectedSectionId} />
            </div>
        </div>
        <div className={styles.layouts}>
            <header>Планировки</header>
            <div>
                {selectedSectionId && <Layouts sectionId={selectedSectionId} />}
            </div>
        </div>
    </div>
}