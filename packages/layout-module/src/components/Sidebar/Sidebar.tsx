import { useState } from 'react'
import { SectionDto } from '../../dataAccess/types'
import { Button } from '../common/Button'
import { Sections } from '../Sections/Sections'
import styles from './Sidebar.module.scss'
import { Layouts } from '../Layouts/Layouts'

export const Sidebar: React.FC = () => {
    const [selectedSection, setSelectedSection] = useState<SectionDto | null>(null)

    return <div className={styles.container}>
        <div className={styles.modeSwitch}>
            <span>Задание</span>
            <span style={{ fontWeight: 600 }}>Редактирование</span>
        </div>
        <div>
            <header>Секции</header>
            <Sections selectedSection={selectedSection ?? undefined} onSelectSection={setSelectedSection} />
        </div>
        <div>
            <header>Планировки</header>
            {selectedSection && <Layouts section={selectedSection} />}
        </div>
        <div className={styles.layoutButtons}>
            <Button>Загрузить из файла</Button>
            <Button>Редактировать</Button>
        </div>
    </div>
}