import React, { useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, authenticated } = useContext(AuthContext);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        setChecked(true);
    }, []);

    if (checked && !authenticated) {
        return <Navigate to="/login" />;
    }

    if (checked && authenticated && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" />;
    }

    if (checked) {
        return children;
    }
    
    // Return null or a loading indicator while checking
    return null;
}

export default ProtectedRoute;