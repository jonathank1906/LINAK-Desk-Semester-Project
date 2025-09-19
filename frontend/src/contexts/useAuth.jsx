import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

import { authenticated_user, login, logout, register } from '../endpoints/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const get_authenticated_user = async () => {
    try {
      const user = await authenticated_user();
      console.log("Authenticated user:", user); 
      setUser(user);
    } catch (error) {
      setUser(null); // If the request fails, set the user to null
    } finally {
      setLoading(false); // Set loading to false after request completes
    }
  };

  const loginUser = async (email, password) => {
    const user = await login(email, password)
    if (user && user.success !== false) {
      setUser(user)
      nav('/')
      return true
    } else {
      alert('Incorrect username or password')
      setUser(null)
      return false
    }
  }

  const logoutUser = async () => {
    await logout();
    nav('/login')
  }

  const registerUser = async (username, email, password, confirm_password) => {
    try {
      if (password === confirm_password) {
        await register(username, email, password)
        alert('User successfully registered')
        nav('/login')
      }
    } catch {
      alert('error registering user')
    }
  }

  useEffect(() => {
    get_authenticated_user();
  }, [window.location.pathname])

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, registerUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);