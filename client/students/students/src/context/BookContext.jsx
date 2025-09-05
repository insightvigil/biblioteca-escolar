import { createContext, useContext, useMemo, useState } from 'react';

const BookContext = createContext(null);

export function BookProvider({ children }) {
  const [lastQuery, setLastQuery] = useState('');
  const [defaultFilters, setDefaultFilters] = useState({
    available: undefined, // true | false | undefined
    sort: 'title',
    order: 'asc',
    limit: 20,
  });

  const value = useMemo(() => ({
    lastQuery, setLastQuery,
    defaultFilters, setDefaultFilters,
  }), [lastQuery, defaultFilters]);

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
}

export function useBookCtx() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error('useBookCtx must be used within <BookProvider>');
  return ctx;
}
