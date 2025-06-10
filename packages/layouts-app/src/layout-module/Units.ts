export class Units {
    /**
     * Перевод из мм во внутренние единицы редактора
     * @param valueInMm значение в мм
     * @returns 
     */
    static fromMm(valueInMm: number): number {
        return valueInMm / 100
    }

    /**
     * Перевод из внутренних единиц редактора в мм
     * @param value значение во внутренних единицах редактора
     * @returns 
     */
    static toMm(value: number): number {
        return value * 100
    }
}