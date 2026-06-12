import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from './pages/DashboardPage'
import ImportPage from './pages/ImportPage'
import RecordsPage from './pages/RecordsPage'
import ValidationPage from './pages/ValidationPage'
import SubmissionsPage from './pages/SubmissionsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
