import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const SocketProvider = ({ children }) => {
    const { user, logout } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const roomsRef = useRef(new Set()); // Keep track of joined house rooms for sync on reconnect

    // Multi-tab sync: Logout detection
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'user' && !e.newValue) {
                // If user data is cleared in another tab (logout), logout this tab too
                logout();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [logout]);

    useEffect(() => {
        if (user) {
            // Singleton connection per user instance
            const newSocket = io(SOCKET_URL, {
                withCredentials: true,
                transports: ['websocket'], // Prioritize websocket for stability/speed
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
                timeout: 20000,
            });

            newSocket.on('connect', () => {
                console.log('[Socket] Connected. Syncing rooms...');
                setConnected(true);
                // Re-sync rooms on reconnection
                roomsRef.current.forEach(houseId => {
                    newSocket.emit('joinHouse', houseId);
                });
            });

            newSocket.on('disconnect', (reason) => {
                console.log('[Socket] Disconnected:', reason);
                setConnected(false);
                if (reason === "io server disconnect") {
                    // the disconnection was initiated by the server, you need to reconnect manually
                    newSocket.connect();
                }
            });

            newSocket.on('connect_error', (err) => {
                console.error('[Socket] Connection Error:', err.message);
                // Optimization: Fallback to polling ONLY if websocket truly fails repeatedly
                if (newSocket.io.opts.transports.length === 1 && newSocket.io.opts.transports[0] === 'websocket') {
                     newSocket.io.opts.transports = ['polling', 'websocket'];
                }
            });

            setSocket(newSocket);

            return () => {
                newSocket.off('connect');
                newSocket.off('disconnect');
                newSocket.off('connect_error');
                newSocket.close();
                console.log('[Socket] Cleanup complete');
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
                setConnected(false);
                roomsRef.current.clear();
            }
        }
    }, [user?.id]); // Only change if user identity changes

    // Helper functions
    const joinHouse = (houseId) => {
        if (!houseId) return;
        roomsRef.current.add(houseId);
        if (socket && connected) {
            socket.emit('joinHouse', houseId);
        }
    };

    const leaveHouse = (houseId) => {
        if (!houseId) return;
        roomsRef.current.delete(houseId);
        if (socket) {
            socket.emit('leaveHouse', houseId);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, connected, joinHouse, leaveHouse }}>
            {children}
        </SocketContext.Provider>
    );
};
