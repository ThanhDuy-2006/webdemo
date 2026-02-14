import React, { useEffect } from 'react';
import './Toast.css';

export function Toast({ message, type = 'info', onClose, duration = 3000 }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    return (
        <div className="toast-container">
            <div className={`toast ${type}`}>
                <span className="toast-icon">{icons[type]}</span>
                <span className="toast-message">{message}</span>
            </div>
        </div>
    );
}
