import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

import Login from './routes/login';
import Menu from './routes/menu';
import PrivateRoute from './components/private_route.jsx';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider } from "./contexts/useAuth";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/' element={<PrivateRoute><Menu /></PrivateRoute>} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App