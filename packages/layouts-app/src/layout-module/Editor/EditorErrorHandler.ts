import { toError } from '../func'
import type { Logger } from '../logger'

export class EditorErrorHandler {
    constructor(private logger: Logger) { }

    handleError(context: string, error: unknown) {
        const err = toError(error)
        this.logger.error(`${context}:`, err)

        // this.eventService.emit({ type: 'error', context, error: err })
    }

    withErrorHandling<T>(context: string, fn: () => T): T | null {
        try {
            return fn()
        } catch (error) {
            this.handleError(context, error)
            return null
        }
    }
}