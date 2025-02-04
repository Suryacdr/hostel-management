"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";

interface DropdownProps {
  trigger: React.ReactNode;
  menu: React.ReactNode[];
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, menu }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]); // Added handleClickOutside to dependencies

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="origin-top-right absolute right-0 mt-2 w-35 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
          <div
            className="py-1"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            {menu.map((menuItem, index) => (
              <div key={index} onClick={() => setOpen(false)}>
                {menuItem}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
