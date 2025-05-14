import styles from './Button.module.scss'

interface ButtonProps {
    children: React.ReactNode
    title?: string
    onClick?: () => void
}

export const Button: React.FC<ButtonProps> = (props) => {
    return (
        <button className={styles.button}
            type='button'
            title={props.title}
            onClick={props.onClick}
        >
            {props.children}
        </button>)
}