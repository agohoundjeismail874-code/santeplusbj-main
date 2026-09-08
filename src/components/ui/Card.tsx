import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ title, description, icon, actionButton, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-white rounded-2xl p-6 border border-[#E5E5E7]
          shadow-sm hover:shadow-md transition-shadow
          ${className}
        `}
        {...props}
      >
        {icon && <div className="text-3xl mb-3">{icon}</div>}
        {title && <h3 className="text-xl font-semibold text-[#1C1C1E] mb-2">{title}</h3>}
        {description && <p className="text-sm text-[#8E8E93] mb-4">{description}</p>}
        {children}
        {actionButton && <div className="mt-4">{actionButton}</div>}
      </div>
    );
  }
);

Card.displayName = 'Card';
