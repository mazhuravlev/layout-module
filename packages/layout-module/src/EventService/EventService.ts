// EventService.ts
import { Subject, Observable, filter } from 'rxjs'
import { AppEvent } from './eventTypes'
import { IDisposable } from '../types'

export class EventService implements IDisposable {
    private eventSubject = new Subject<AppEvent>()

    get events$(): Observable<AppEvent> {
        return this.eventSubject.asObservable()
    }

    get mousedown$(): Observable<AppEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mousedown'))
    }

    get mouseup$(): Observable<AppEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mouseup'))
    }

    public emit(event: AppEvent) {
        this.eventSubject.next(event)
    }

    public dispose() {
        this.eventSubject.complete()
    }
}