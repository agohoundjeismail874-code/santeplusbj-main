import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#1C1C1E] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-4 top-1/2 transform -translate-y-1/2">{icon}</div>}
          <input
            ref={ref}
            className={`
              w-full h-14 px-4 ${icon ? 'pl-12' : ''} rounded-2xl text-lg
              border-2 border-[#E5E5E7] transition-colors
              placeholder-[#8E8E93] text-[#1C1C1E]
              focus:outline-none focus:border-[#00D26A]
              disabled:bg-[#F2F2F7] disabled:cursor-not-allowed
              ${error ? 'border-[#FF3B30]' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-[#FF3B30]">{error}</p>}
        {helperText && <p className="mt-1 text-xs text-[#8E8E93]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
