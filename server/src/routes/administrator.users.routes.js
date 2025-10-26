// server/src/routes/administrator.users.routes.js
import { Router } from 'express'
import {
  findUsers,    // GET /admin/users/find?q=...
  listUsers,    // GET /admin/users?q=&page=&pageSize=
  getUser,      // GET /admin/users/:id
  createUser,   // POST /admin/users
  updateUser,   // PUT /admin/users/:id
  deleteUser,   // DELETE /admin/users/:id
} from '../controllers/users.controller.js'
import { listCareers } from '../controllers/admin-loans.controller.js' // ya la tienes

const r = Router()

// Compat con GUI actual:
r.get('/users/find', findUsers)
r.post('/users', createUser)

// CRUD nuevo:
r.get('/users', listUsers)
r.get('/users/:id', getUser)
r.put('/users/:id', updateUser)
r.delete('/users/:id', deleteUser)

// Catálogo auxiliar:
r.get('/careers', listCareers)

export default r
