import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Appointments from './pages/Appointments';
import Treatments from './pages/Treatments';
import Debts from './pages/Debts';
import Collections from './pages/Collections';
import Payments from './pages/Payments';
import Cash from './pages/Cash';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PWAInstallPrompt from './components/PWAInstallPrompt';

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <PWAInstallPrompt />
                <Router>
                    <Routes>
                        {/* Public */}
                        <Route path="/login" element={<Login />} />

                        {/* Redirect /dashboard to / */}
                        <Route path="/dashboard" element={<Navigate to="/" replace />} />

                        {/* Protected Routes */}
                        <Route element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/customers" element={<Customers />} />
                            <Route path="/customers/:id" element={<CustomerProfile />} />
                            <Route path="/appointments" element={<Appointments />} />
                            <Route path="/treatments" element={<Treatments />} />
                            <Route path="/debts" element={<Debts />} />
                            <Route path="/collections" element={<Collections />} />
                            <Route path="/payments" element={<Payments />} />
                            <Route path="/cash" element={<Cash />} />
                            <Route path="/expenses" element={
                                <ProtectedRoute role="admin">
                                    <Expenses />
                                </ProtectedRoute>
                            } />
                            <Route path="/reports" element={
                                <ProtectedRoute role="admin">
                                    <Reports />
                                </ProtectedRoute>
                            } />
                            <Route path="/users" element={
                                <ProtectedRoute role="admin">
                                    <Users />
                                </ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                                <ProtectedRoute role="admin">
                                    <Settings />
                                </ProtectedRoute>
                            } />
                            {/* Handled within Protected Layout */}
                            <Route path="*" element={<NotFound />} />
                        </Route>

                        {/* Global Catch-all for truly unauthenticated orphans */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}
