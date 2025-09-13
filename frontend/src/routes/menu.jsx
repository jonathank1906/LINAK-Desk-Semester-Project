import { Button } from "@/components/ui/button"
import { logout} from '../endpoints/api';
import { useNavigate } from 'react-router-dom';

const Menu = () => {
    const nav = useNavigate();

    const handleLogout = async () => {
        const success = await logout();
        if (success) {
            nav('/login');
        }
    }

    return (
        <Button onClick={handleLogout}>Log out</Button>
    )
}




export default Menu;