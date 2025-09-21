import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

import { authenticated_user, login, logout, register } from '../endpoints/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const get_authenticated_user = async () => {
    setLoading(true);
    try {
      const user = await authenticated_user();
      setUser(user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    setLoading(true);
    const user = await login(email, password);
    if (user && user.success !== false) {
      await get_authenticated_user(); // Ensure user state is up-to-date
      setLoading(false);
      return true;
    } else {
      alert('Incorrect username or password');
      setUser(null);
      setLoading(false);
      return false;
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    await logout();
    setUser(null);
    setLoading(false);
    nav('/login');
  };

  const registerUser = async (username, email, password, confirm_password) => {
    setLoading(true);
    try {
      if (password === confirm_password) {
        await register(username, email, password);
        alert('User successfully registered');
        nav('/');
      }
    } catch {
      alert('error registering user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    get_authenticated_user();
    // eslint-disable-next-line
  }, [window.location.pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, registerUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);