import { Route, Routes } from 'react-router'

import { LoginRoute } from '@/routes/LoginRoute'
import { RequireAuth } from '@/routes/RequireAuth'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route index element={<h1 className="p-6 text-2xl font-semibold">HAU-Sync</h1>} />
      </Route>
    </Routes>
  )
}

export default App
