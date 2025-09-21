import { useAuth } from '../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/shadcn-io/spinner';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth(); // Use actual loading from context
    const navigate = useNavigate();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (user) {
                setShouldRender(true);
            } else {
                navigate('/login', { replace: true });
            }
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    width: '100vw',
                }}
            >
                <Spinner variant="circle" size={64}/>
            </div>
        );
    }

    return shouldRender ? children : null;
};

export default PrivateRoute;