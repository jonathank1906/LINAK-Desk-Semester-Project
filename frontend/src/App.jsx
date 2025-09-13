import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from './routes/login';
import Menu from './routes/menu';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<Menu />} />
      </Routes>
    </Router>
  );
}

export default App