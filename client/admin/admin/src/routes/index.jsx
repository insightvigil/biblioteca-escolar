import AppLayout from '../layouts/AppLayout.jsx'
import Dashboard from './dashboard.jsx'
import BooksList from './books/list.jsx'
import NewBook from './books/new.jsx'
import EditBook from './books/edit.jsx'
import CategoriesList from './categories/list.jsx'
import NotFound from './not-found.jsx'
import NewCategory from './categories/new.jsx'
import EditCategory from './categories/edit.jsx'

const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'books', element: <BooksList /> },
      { path: 'books/new', element: <NewBook /> },
      { path: 'books/:id/edit', element: <EditBook /> },
      { path: 'categories', element: <CategoriesList /> },
      { path: '*', element: <NotFound /> },
      { path: 'categories/new', element: <NewCategory /> },
      { path: 'categories/:id/edit', element: <EditCategory /> },
    ],
  },
]

export default routes
