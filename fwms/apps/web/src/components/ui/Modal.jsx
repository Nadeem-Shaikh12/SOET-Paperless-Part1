import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';


export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`w-full ${sizeClasses[size]} bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}
        style={{ boxShadow: 'var(--elevation-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-slate)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)] transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
