import css from './List.module.scss'

interface ListProps {
    children: React.ReactNode
}

export const List: React.FC<ListProps> = (props) => {
    return <ul className={css.list}>{props.children}</ul>
}