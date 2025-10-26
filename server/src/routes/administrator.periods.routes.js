// server/src/routes/administrator.periods.routes.js
import { Router } from 'express'
import { listPeriods, listHolidays, addHoliday, deleteHoliday } from '../controllers/admin-loans.controller.js'
const r = Router()
r.get('/periods', listPeriods)
r.get('/periods/:id/holidays', listHolidays)
r.post('/periods/:id/holidays', addHoliday)
r.delete('/periods/:id/holidays/:date', deleteHoliday)
export default r
