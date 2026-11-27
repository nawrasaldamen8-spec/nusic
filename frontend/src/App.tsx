import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { LoginForm } from './features/auth/LoginForm'
import { AmbientOrbs } from './shared/components/AmbientOrbs'
import { Workspace } from './Workspace'

function AppGate() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Workspace /> : <LoginForm />
}

export default function App() {
  return (
    <AuthProvider>
      <div className="relative min-h-dvh bg-void-black">
        <AmbientOrbs />
        <AppGate />
      </div>
    </AuthProvider>
  )
}
