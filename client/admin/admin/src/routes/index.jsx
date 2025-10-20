import AppLayout from '../layouts/AppLayout.jsx'
import Dashboard from './dashboard.jsx'
import BooksList from './books/list.jsx'
import NewBook from './books/new.jsx'
import EditBook from './books/edit.jsx'
import CategoriesList from './categories/list.jsx'
import NotFound from './not-found.jsx'
import NewCategory from './categories/new.jsx'
import EditCategory from './categories/edit.jsx'
import LoansList from './loans/list.jsx'
import LoanNew from './loans/new.jsx'
import LoanDetail from './loans/detail.jsx'
import LoanReturn from './loans/return.jsx'
import LoanReports from './loans/reports.jsx'
import Settings from './settings/settings.jsx'

const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [

            { path: 'loans', element: <LoansList /> },
            { path: 'loans/new', element: <LoanNew /> },
            { path: 'loans/:id', element: <LoanDetail /> },
            { path: 'loans/:id/return', element: <LoanReturn /> },
            { path: 'loans/reports', element: <LoanReports /> },

      { index: true, element: <Dashboard /> },
      { path: 'books', element: <BooksList /> },
      { path: 'books/new', element: <NewBook /> },
      { path: 'books/:id/edit', element: <EditBook /> },
      { path: 'categories', element: <CategoriesList /> },
      { path: '*', element: <NotFound /> },
      { path: 'categories/new', element: <NewCategory /> },
      { path: 'categories/:id/edit', element: <EditCategory /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]

export default routes
