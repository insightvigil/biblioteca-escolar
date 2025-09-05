import AppLayout from '../layouts/AppLayout.jsx'
import Dashboard from './dashboard.jsx'
import BooksList from './books/list.jsx'
import CategoriesList from './categories/list.jsx'
import NotFound from './not-found.jsx'

const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'books', element: <BooksList /> },
      { path: 'categories', element: <CategoriesList /> },
      { path: '*', element: <NotFound /> },
      
    ],
  },
]

export default routes
