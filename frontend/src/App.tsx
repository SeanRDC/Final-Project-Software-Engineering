import { useAuth } from '@/auth/authContext'
import { LoginPage } from '@/pages/LoginPage'

function App() {
  const { user } = useAuth()

  if (!user) return <LoginPage />

  return <h1 className="p-6 text-2xl font-semibold">HAU-Sync</h1>
}

export default App
