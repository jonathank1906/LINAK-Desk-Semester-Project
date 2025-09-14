import { useAuth } from '../contexts/useAuth';
import { useNavigate } from 'react-router-dom';


const PrivateRoute = ({children}) => {
    const { user, loading } = useAuth();
    const nav = useNavigate();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (user) {
        return children;
    } else {
        nav('/login');
    }
}

export default PrivateRoute;