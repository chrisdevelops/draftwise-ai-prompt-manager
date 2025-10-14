import React from 'react';

interface ResizerProps {
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

const Resizer: React.FC<ResizerProps> = ({ onMouseDown, className }) => {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`w-1.5 cursor-col-resize bg-slate-700/50 hover:bg-indigo-500 transition-colors duration-200 flex-shrink-0 ${className || ''}`}
    />
  );
};

export default Resizer;
