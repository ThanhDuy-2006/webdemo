import React from 'react';
import './ConfirmModal.css';

export function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay">
            <div className="confirm-modal-content">
                <div className="confirm-modal-message">{message}</div>
                <div className="confirm-modal-actions">
                    <button className="confirm-btn cancel" onClick={onCancel}>Hủy</button>
                    <button className="confirm-btn confirm" onClick={onConfirm}>Đồng ý</button>
                </div>
            </div>
        </div>
    );
}
