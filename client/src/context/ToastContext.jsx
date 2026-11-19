import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, success: (m) => showToast(m, 'success'), error: (m) => showToast(m, 'error'), warning: (m) => showToast(m, 'warning'), info: (m) => showToast(m, 'info') }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => {
          let bg = '#FFFFFF';
          let border = '#E5E5E5';
          let textColor = '#171717';
          let Icon = FiInfo;
          let iconColor = '#2563EB';

          if (toast.type === 'success') {
            border = '#DCFCE7';
            Icon = FiCheckCircle;
            iconColor = '#16A34A';
          } else if (toast.type === 'error') {
            border = '#FEE2E2';
            Icon = FiAlertCircle;
            iconColor = '#DC2626';
          } else if (toast.type === 'warning') {
            border = '#FEF3C7';
            Icon = FiAlertTriangle;
            iconColor = '#D97706';
          }

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                minWidth: 280,
                maxWidth: 420,
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: textColor,
                fontSize: '13.5px',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
              <div style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#A3A3A3',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2
                }}
              >
                <FiX size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
