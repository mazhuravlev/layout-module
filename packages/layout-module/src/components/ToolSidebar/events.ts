import { createEvent } from 'effector'
import { ApartmentTemplate } from '../../types'

export const addApartmentEvent = createEvent<ApartmentTemplate>()
