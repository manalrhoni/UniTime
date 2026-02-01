import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import des composants
import Home from './components/Home';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword'; 

import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';

import './notifications.css';

import { NeonAssistant } from './components/neon/NeonAssistant'; 

//On importe directement depuis 'sonner' pour que le positionnement fonctionne
import { Toaster } from 'sonner'; 

import LegalPage from './components/LegalPage';
import SupportPage from './components/SupportPage';

// Protection des routes
const PrivateRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role && user.role !== role && user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/legal" element={<LegalPage />} />
        <Route path="/support" element={<SupportPage />} />

        <Route 
          path="/admin" 
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/teacher" 
          element={
            <PrivateRoute role="enseignant">
              {/* L'ID "t1" est écrasé par la logique interne du Dashboard maintenant */}
              <TeacherDashboard teacherId="1" />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/student" 
          element={
            <PrivateRoute role="student">
              <StudentDashboard groupId="g1" departmentId="d1" />
            </PrivateRoute>
          } 
        />
      </Routes>

      {/*CONFIGURATION ULTIME DES NOTIFICATIONS */}
      {/* Grâce à l'import direct, 'position="top-center"' fonctionnera correctement */}
      <Toaster 
        position="top-center"
        expand={false}
        richColors 
        closeButton 
        theme="dark"
        offset="20px"
        toastOptions={{
          duration: 4000,
          style: { background: '#1e293b', border: '1px solid #334155', color: 'white' } // Style forcé pour être joli
        }}
      />

      {/* L'Assistant NEON */}
      <NeonAssistant />

    </Router>
  );
}

export default App;