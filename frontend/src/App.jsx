import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import Login from './routes/login';
import Menu from './routes/menu';
import PrivateRoute from './components/private_route.jsx';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import Activate from './pages/Activate';
import { AuthProvider } from "./contexts/useAuth";
import { PostureReminderProvider } from "./contexts/usePostureReminder";
import PostureReminderModal from "./components/PostureReminderModal";

import "./styles/animation.css";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <AuthProvider>
          <PostureReminderProvider>
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route path='/reset/password' element={<ResetPassword />} />
              <Route path='/password/reset/confirm/:uid/:token' element={<ResetPasswordConfirm />} />
              <Route exact path='/activate/:uid/:token' element={<Activate />} />
              <Route path='/' element={<PrivateRoute><Menu /></PrivateRoute>} />
            </Routes>
            <PostureReminderModal />
          </PostureReminderProvider>
        </AuthProvider>
      </Router>
      <Toaster richColors />
    </ThemeProvider>
  );
}

export default App