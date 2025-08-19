import React, { useEffect, useRef } from 'react';

export default function AutoTextarea({ value, onChange, onKeyDown, minRows = 1, maxRows = 8, className = '', placeholder = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseInt(window.getComputedStyle(el).lineHeight || '20', 10);
    const maxHeight = lineHeight * maxRows;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  }, [value, maxRows]);

  return (
    <textarea
      ref={ref}
      className={className}
      rows={minRows}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label="Escribe tu mensaje"
      spellCheck
    />
  );
}
