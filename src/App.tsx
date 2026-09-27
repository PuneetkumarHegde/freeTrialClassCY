import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TimezoneProvider } from './context/TimezoneContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { MentorDashboard } from './pages/MentorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClassroomPage } from './pages/ClassroomPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TimezoneProvider>
          <Routes>
            {/* Public Landing Page with Trial Booking Flow */}
            <Route path="/" element={<HomePage />} />

            {/* Dedicated Full-Page Split-Screen Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Live 1:1 STEM Classroom */}
            <Route path="/class/:appointmentId" element={<ClassroomPage />} />
            <Route path="/class/*" element={<ClassroomPage />} />

            {/* Direct private login aliases redirect cleanly to /login */}
            <Route path="/mentor/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />

            {/* Student / Parent Dashboard (Role: PARENT or ADMIN) */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['PARENT', 'ADMIN']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={['PARENT', 'ADMIN']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/*"
              element={
                <ProtectedRoute allowedRoles={['PARENT', 'ADMIN']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Mentor Faculty Portal (Role: MENTOR or ADMIN) */}
            <Route
              path="/mentor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mentor/*"
              element={
                <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Management Portal (Role: ADMIN only) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback Catch-all Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TimezoneProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
