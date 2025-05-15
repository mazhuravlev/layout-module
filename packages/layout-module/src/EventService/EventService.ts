// EventService.ts
import { Subject, Observable, filter } from 'rxjs'
import { AppEvent, MouseDownEvent, MouseUpEvent } from './eventTypes'
import { IDisposable } from '../Editor/types'

export class EventService implements IDisposable {
    private eventSubject = new Subject<AppEvent>()

    get events$(): Observable<AppEvent> {
        return this.eventSubject.asObservable()
    }

    get mousedown$(): Observable<MouseDownEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mousedown'))
    }

    get mouseup$(): Observable<MouseUpEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mouseup'))
    }

    public emit(event: AppEvent) {
        this.eventSubject.next(event)
    }

    public dispose() {
        this.eventSubject.complete()
    }
}