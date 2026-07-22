import React from 'react';

export const Table = ({ children, className = '', ...props }) => (
  <div className={`w-full overflow-auto ${className}`}>
    <table className="w-full text-sm text-left" {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, className = '', ...props }) => (
  <thead className={`text-xs text-gray-500 bg-gray-50/50 uppercase border-y border-border ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '', ...props }) => (
  <tbody className={`divide-y divide-border ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '', hover = true, ...props }) => (
  <tr className={`${hover ? 'hover:bg-gray-50/50 transition-colors' : ''} ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ children, className = '', ...props }) => (
  <th className={`px-4 py-3 font-medium ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '', ...props }) => (
  <td className={`px-4 py-3 ${className}`} {...props}>
    {children}
  </td>
);
