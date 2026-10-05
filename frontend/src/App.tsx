import { Route, Routes } from 'react-router'

import { AppShell } from '@/layout/AppShell'
import { DASHBOARD, UPCOMING_PAGES } from '@/layout/pages'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { LoginRoute } from '@/routes/LoginRoute'
import { RequireAuth } from '@/routes/RequireAuth'
import { RequirePermission } from '@/routes/RequirePermission'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<PlaceholderPage title={DASHBOARD.title} />} />
          {UPCOMING_PAGES.map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={
                <RequirePermission permission={page.permission}>
                  <PlaceholderPage title={page.title} />
                </RequirePermission>
              }
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
