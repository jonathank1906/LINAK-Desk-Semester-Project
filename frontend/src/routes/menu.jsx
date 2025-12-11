import { useAuth } from "@/contexts/useAuth";
import { useNavigate } from 'react-router-dom';
import AdminDashboard from "./Admin/AdminDashboard"; 
import EmployeeDashboard from "./Employee/EmployeeDashboard";

const Menu = () => {
    const { user, loading, logoutUser } = useAuth();
    const nav = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
    }

    return (
        <div>
            <main>
                {user.is_admin ? <AdminDashboard /> : <EmployeeDashboard />}
            </main>
        </div>
    );
}

export default Menu;