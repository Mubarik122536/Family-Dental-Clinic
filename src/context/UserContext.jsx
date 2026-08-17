import { createContext, useContext, useState } from 'react';

// Simple user context — before auth, reads from localStorage.
// After auth is implemented, this will be replaced with a JWT-decoded user.

const defaultUser = {
    name: 'Admin User',
    role: 'Clinic Administrator',
    initials: 'AU',
};

const UserContext = createContext(defaultUser);

export function UserProvider({ children }) {
    const stored = (() => {
        try { return JSON.parse(localStorage.getItem('clinic_user')) || defaultUser; } catch { return defaultUser; }
    })();

    const [user, setUser] = useState(stored);

    const updateUser = (updates) => {
        const next = { ...user, ...updates };
        next.initials = next.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
        setUser(next);
        localStorage.setItem('clinic_user', JSON.stringify(next));
    };

    return (
        <UserContext.Provider value={{ user, updateUser }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
