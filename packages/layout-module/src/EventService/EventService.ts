// EventService.ts
import { Subject, Observable } from 'rxjs'
import { AppEvent } from './eventTypes'
import { IDisposable } from '../types'

export class EventService implements IDisposable {
    private eventSubject = new Subject<AppEvent>()

    get events$(): Observable<AppEvent> {
        return this.eventSubject.asObservable()
    }

    public emit(event: AppEvent) {
        this.eventSubject.next(event)
    }

    public dispose() {
        this.eventSubject.complete()
    }
}