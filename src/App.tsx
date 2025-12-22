import React, { useState, useEffect } from 'react';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';

// Import all page components
import LandingPage from './components/pages/LandingPage';
import ScannerPage from './components/pages/ScannerPage';
import Dashboard from './components/pages/Dashboard';
import EditorPage from './components/pages/EditorPage';
import ResumeView from './components/pages/ResumeView';
import AuthGuard from './components/auth/AuthGuard';

// Simple routing state management
type PageRoute = 'landing' | 'scanner' | 'dashboard' | 'editor' | 'resume';

// Main Content Component
const RefolioApp = () => {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageRoute>('landing');

  // Effect: Navigate based on authentication state
  useEffect(() => {
    // If user is not authenticated and trying to access protected pages, redirect to landing
    if (!currentUser && ['dashboard', 'editor', 'resume'].includes(currentPage)) {
      setCurrentPage('landing');
    }
  }, [currentUser, currentPage]);

  // Simple navigation function
  const navigateTo = (page: PageRoute) => {
    setCurrentPage(page);
  };

  // Render current page
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={navigateTo} />;
      
      case 'scanner':
        return <ScannerPage onNavigate={navigateTo} />;
      
      case 'dashboard':
        return (
          <AuthGuard>
            <Dashboard onNavigate={navigateTo} />
          </AuthGuard>
        );
      
      case 'editor':
        return (
          <AuthGuard>
            <EditorPage onNavigate={navigateTo} />
          </AuthGuard>
        );
      
      case 'resume':
        return (
          <AuthGuard>
            <ResumeView onNavigate={navigateTo} />
          </AuthGuard>
        );
      
      default:
        return <LandingPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="app">
      {renderCurrentPage()}
    </div>
  );
};

// Root App Component
function App() {
  return (
    <AuthProvider>
      <RefolioApp />
    </AuthProvider>
  );
}

export default App;
