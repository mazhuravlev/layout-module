import type { LluData } from '../types'
import lluDataJson from './LLUs2.json'

export const lluData: LluData[] = lluDataJson.map(_x => {
    const llu: LluData = {
        name: '',
        outline: [],
        geometry: [],
    }
    return llu
})