import styles from './inputs.module.scss'

interface NumberInputProps {
    label: string
    value: number
    width?: number
    step?: number
    onChange: (v: number) => void
}

export const NumberInput: React.FC<NumberInputProps> = (props) => {
    return <label className={styles.label}>
        {props.label}:
        <input type='number'
            className={styles.input}
            value={props.value}
            step={props.step}
            style={{ width: props.width }}
            onChange={e => props.onChange(Number(e.target.value))} />
    </label>
}

interface TextInputProps {
    label: string
    value: string
    onChange: (v: string) => void
}

export const TextInput: React.FC<TextInputProps> = (props) => {
    return <label style={{ fontSize: '0.8rem' }}>
        {props.label}:
        <input type='text'
            value={props.value}
            onChange={e => props.onChange(e.target.value)} />
    </label>
}