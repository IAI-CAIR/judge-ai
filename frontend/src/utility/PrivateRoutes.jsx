import { useLocation, Navigate } from 'react-router-dom'
import { isAuthenticated } from './helper';
import { useSocket } from "../utility/Auth";

const PrivateRoute = (props) => {
    const location = useLocation();
    const { error, setError } = useSocket();
    const data = isAuthenticated();

    console.log(data);
    const isAuthorized = isAuthenticated();
    
    const isEverythingOk = data.jwt && data.user && isAuthorized
    return isEverythingOk ? (
        // <Outlet />
        props.children
    ) : (
        setError("You need to be logged in to access Dashboard"),
        <Navigate to='/login' state={{ from: location }} replace />
    )
}

export default PrivateRoute;