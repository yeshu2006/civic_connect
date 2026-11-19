import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--bg-page)'
      }}
    >
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px'
            }}
          >
            C
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            CivicConnect
          </span>
        </Link>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 6 }}>
          AI-Powered Civic Issue Reporting & Management Platform
        </p>
      </div>

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '32px 28px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <Outlet />
      </div>

      <div style={{ marginTop: 24, fontSize: '12px', color: 'var(--text-tertiary)' }}>
        &copy; {new Date().getFullYear()} CivicConnect Platform. All rights reserved.
      </div>
    </div>
  );
}
