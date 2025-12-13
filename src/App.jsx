import React from 'react';
import { useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard'; // Import the new Dashboard

function App() {
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }
  
  return <Dashboard />;
}

export default App;