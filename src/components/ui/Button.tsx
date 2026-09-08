import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'urgency';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    className = '',
    disabled = false,
    children,
    ...props
  }, ref) => {
    const baseStyles = 'font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2';

    const variantStyles = {
      primary: 'bg-[#00D26A] text-white hover:bg-[#00B857] active:bg-[#009D46]',
      secondary: 'border-2 border-[#00D26A] text-[#00D26A] hover:bg-[#f0f9f5] active:bg-[#e8f5f0]',
      danger: 'bg-[#FF3B30] text-white hover:bg-[#FF1500] active:bg-[#E60000]',
      urgency: 'bg-[#FF3B30] text-white rounded-full hover:bg-[#FF1500] active:bg-[#E60000]',
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm h-10',
      md: 'px-6 py-3 text-base h-12',
      lg: 'px-8 py-4 text-lg h-14',
    };

    const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';
    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${widthStyles} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
