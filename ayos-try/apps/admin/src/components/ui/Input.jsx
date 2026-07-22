import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  error, 
  icon: Icon,
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-navy mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          ref={ref}
          className={`
            block w-full rounded-lg border 
            ${error ? 'border-danger focus:ring-danger' : 'border-border focus:border-primary focus:ring-primary'}
            ${Icon ? 'pl-10' : 'pl-3'}
            pr-3 py-2 text-sm text-navy placeholder-gray-400
            transition-colors focus:outline-none focus:ring-1
            shadow-sm bg-white
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
