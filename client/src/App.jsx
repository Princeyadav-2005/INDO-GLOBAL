import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import AppLayout from './components/Layout/AppLayout'
import LoadingSpinner from './components/UI/LoadingSpinner'

// Auth Pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Dashboard
import Dashboard from './pages/Dashboard/Dashboard'

// FarmGuard
import ExpenseDiary from './pages/FarmGuard/ExpenseDiary'
import ExpenseForm from './pages/FarmGuard/ExpenseForm'
import FarmSetup from './pages/FarmGuard/FarmSetup'

// Smart Mandi
import MandiExplorer from './pages/SmartMandi/MandiExplorer'
import PriceAnalysis from './pages/SmartMandi/PriceAnalysis'
import MarketComparison from './pages/SmartMandi/MarketComparison'
import NetProceedsCalc from './pages/SmartMandi/NetProceedsCalc'

// Khet Hisab
import SeasonLedger from './pages/KhetHisab/SeasonLedger'
import SeasonDetail from './pages/KhetHisab/SeasonDetail'
import DisputeCenter from './pages/KhetHisab/DisputeCenter'

// QR Passport
import PassportGenerator from './pages/QRPassport/PassportGenerator'
import PassportView from './pages/QRPassport/PassportView'

// AI Krishi & Utilities
import KrishiMitra from './pages/AIKrishi/KrishiMitra'
import WeatherPage from './pages/Weather/WeatherPage'
import SchemesPage from './pages/Schemes/SchemesPage'
import MarketplacePage from './pages/Marketplace/MarketplacePage'

// Settings
import SettingsPage from './pages/Settings/SettingsPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingSpinner message="Khet session restore ho raha hai..." />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/passport/:token" element={<PassportView />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />

              {/* FarmGuard */}
              <Route path="/farmguard" element={<ExpenseDiary />} />
              <Route path="/farmguard/new" element={<ExpenseForm />} />
              <Route path="/farmguard/farm-setup" element={<FarmSetup />} />

              {/* Smart Mandi */}
              <Route path="/mandi" element={<MandiExplorer />} />
              <Route path="/mandi/price-analysis" element={<PriceAnalysis />} />
              <Route path="/mandi/compare" element={<MarketComparison />} />
              <Route path="/mandi/proceeds" element={<NetProceedsCalc />} />

              {/* Khet Hisab */}
              <Route path="/khet-hisab" element={<SeasonLedger />} />
              <Route path="/khet-hisab/:seasonId" element={<SeasonDetail />} />
              <Route path="/khet-hisab/:seasonId/disputes" element={<DisputeCenter />} />
              <Route path="/khet-hisab/disputes" element={<DisputeCenter />} />

              {/* QR Passport */}
              <Route path="/qr" element={<PassportGenerator />} />

              {/* Krishi Mitra AI */}
              <Route path="/ai-mitra" element={<KrishiMitra />} />

              {/* Weather, Schemes, Marketplace */}
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/schemes" element={<SchemesPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
