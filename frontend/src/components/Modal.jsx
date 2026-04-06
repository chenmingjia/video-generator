import React from 'react';

export default function Modal({ open, onClose, title, children, footer, className = '' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-xl flex flex-col ${className}`} style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full border border-border hover:bg-accent flex items-center justify-center">×</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        {footer ? (
          <div className="px-6 py-4 border-t border-border bg-accent/30 flex-shrink-0">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
