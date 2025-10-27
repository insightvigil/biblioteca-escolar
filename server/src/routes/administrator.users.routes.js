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
import { getAllLibraryUsers, getLibraryUserById,createLibraryUser,updateLibraryUser } from '../controllers/admin-library-users.controller.js'

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

// CRUD Library Users
r.get('/libraryUsers', getAllLibraryUsers)
r.get('/libraryUsers/:id', getLibraryUserById)
r.post('/libraryUsers', createLibraryUser)
r.put('/libraryUsers/:id', updateLibraryUser)
//r.delete('/libraryUsers/:id', deleteLibraryUser)
export default r
