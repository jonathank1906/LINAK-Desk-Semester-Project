import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/useAuth";
import { useNavigate } from 'react-router-dom';
import AdminDashboard from "./Admin/AdminDashboard"; // Import your real admin dashboard

function EmployeeDashboard() {
    return <div>Employee Dashboard</div>;
}

const Menu = () => {
    const { user, loading, logoutUser } = useAuth();
    const nav = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
    }

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>No user found.</div>;

    return (
        <div>
            <main>
                {user.is_staff ? <AdminDashboard /> : <EmployeeDashboard />}
            </main>
        </div>
    );
}

export default Menu;