// server/src/routes/administrator.users.routes.js
import { Router } from 'express'
import { findUsers, createUser, listCareers } from '../controllers/admin-loans.controller.js'
const r = Router()
r.get('/users/find', findUsers)
r.post('/users', createUser)
r.get('/careers', listCareers) // opcional
export default r
