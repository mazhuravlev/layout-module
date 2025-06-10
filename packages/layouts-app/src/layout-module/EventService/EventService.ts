// EventService.ts
import type { Observable} from 'rxjs'
import { Subject, filter } from 'rxjs'
import type { AppEvent, MouseDownEvent, MouseEnterEvent, MouseLeaveEvent, MouseMoveEvent, MouseUpEvent } from './eventTypes'
import type { IDisposable } from '../types'
import { Logger } from '../logger'

export class EventService implements IDisposable {
    private _logger = new Logger('EventService')
    private _eventSubject = new Subject<AppEvent>()

    get events$(): Observable<AppEvent> {
        return this._eventSubject.asObservable()
    }

    get mousemoves$(): Observable<MouseMoveEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mousemove'))
    }

    get mousedown$(): Observable<MouseDownEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mousedown'))
    }

    get mouseup$(): Observable<MouseUpEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mouseup'))
    }

    get mouseenter$(): Observable<MouseEnterEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mouseenter'))
    }

    get mouseleave$(): Observable<MouseLeaveEvent> {
        return this.events$.pipe(filter((event) => event.type === 'mouseleave'))
    }

    public emit(event: AppEvent) {
        this._eventSubject.next(event)
    }

    public dispose() {
        this._eventSubject.complete()
    }
}