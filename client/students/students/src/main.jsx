import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import App from './App.jsx'
import Home from './routes/Home/home.component.jsx'
import Category from './routes/Category/category.component.jsx'
import BookDetail from './routes/BookDetail/book-detail.component.jsx'
import Regulation from './routes/Regulation/regulation.component.jsx'
import NotFound from './routes/NotFound/not-found.component.jsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'categoria/:id', element: <Category /> },
      { path: 'libro/:id', element: <BookDetail /> },
      { path: 'reglamento', element: <Regulation /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
