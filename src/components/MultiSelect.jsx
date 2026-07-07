import React, { useState, useEffect, useRef } from 'react';

const MultiSelect = ({ label, options, value, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset local search when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [isOpen]);

  const filteredOptions = options.filter(o =>
    o && String(o).toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const toggleOption = (option) => {
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    onChange(options);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest('.custom-select-container') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    }
  };

  const handleItemKeyDown = (e, option) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOption(option);
    }
  };

  return (
    <div className="w-full relative" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <span className="portal-label text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">{label}</span>
      <div
        className="custom-select-container bg-white border border-gray-200 rounded-lg shadow-sm hover:border-teal-400 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        {value.length === 0 && <span className="text-gray-400 text-xs ml-1 font-medium">{placeholder}</span>}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 max-w-[85%] overflow-hidden h-6 items-center">
            {value.slice(0, 2).map(v => (
              <span key={v} className="tag-chip bg-teal-50 text-teal-800 border-teal-100 rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center">
                {v} 
                <span 
                  className="tag-close hover:text-teal-600 ml-1 cursor-pointer font-bold text-sm" 
                  onClick={(e) => { e.stopPropagation(); toggleOption(v); }}
                >
                  ×
                </span>
              </span>
            ))}
            {value.length > 2 && <span className="tag-chip bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-bold">+{value.length - 2}</span>}
          </div>
        )}
        <div className="ml-auto flex items-center pr-1">
          {value.length > 0 && (
            <span onClick={clearAll} className="mr-1.5 text-gray-300 hover:text-red-500 cursor-pointer font-bold text-lg leading-none">
              ×
            </span>
          )}
          <span className="text-gray-400 text-[10px] transform scale-75">▼</span>
        </div>
      </div>
      {isOpen && (
        <div className="dropdown-menu border border-gray-200 shadow-xl rounded-lg mt-1 overflow-hidden z-[100] absolute w-full bg-white">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              className="w-full text-xs border border-gray-200 rounded-md p-1.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex divide-x divide-gray-100 border-b border-gray-100 bg-teal-50/20 text-xs">
            <button 
              type="button"
              className="flex-1 py-2 text-teal-700 font-bold hover:bg-teal-50 transition-colors"
              onClick={handleSelectAll}
            >
              SELECT ALL
            </button>
            <button 
              type="button"
              className="flex-1 py-2 text-red-600 font-bold hover:bg-rose-50 transition-colors"
              onClick={clearAll}
            >
              CLEAR ALL
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map(option => (
              <div
                key={option}
                className={`dropdown-item cursor-pointer p-2 text-xs border-b border-gray-50 last:border-0 focus:outline-none focus:bg-teal-50/50 ${
                  value.includes(option) 
                    ? 'selected bg-teal-50 text-teal-800 font-bold' 
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
                onClick={() => toggleOption(option)}
                tabIndex={0}
                onKeyDown={(e) => handleItemKeyDown(e, option)}
              >
                {option}
              </div>
            ))}
            {filteredOptions.length === 0 && <div className="p-3 text-xs text-gray-400 text-center italic">No results found</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
