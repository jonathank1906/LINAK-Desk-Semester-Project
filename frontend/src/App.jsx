import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from './routes/login';
import Menu from './routes/menu';
import PrivateRoute from './components/private_route.jsx';

import { AuthProvider } from "./contexts/useAuth";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/' element={<PrivateRoute><Menu /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App