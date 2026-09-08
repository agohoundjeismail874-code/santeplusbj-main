import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'w-96',
    md: 'w-[500px]',
    lg: 'w-[640px]',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto ${sizeStyles[size]}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E5E7]">
          {title && <h2 className="text-2xl font-bold text-[#1C1C1E]">{title}</h2>}
          <button
            onClick={onClose}
            className="text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && <div className="p-6 border-t border-[#E5E5E7]">{footer}</div>}
      </div>
    </div>
  );
};
