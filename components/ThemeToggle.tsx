"use client";

import { useTheme } from "@/hooks/ThemeProvider";
import { SunIcon, MoonIcon, LaptopIcon } from "lucide-react";
import Dropdown from "./Dropdown";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const trigger = (
    <button className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
      {theme === "light" && <SunIcon className="h-5 w-5 text-yellow-500" />}
      {theme === "dark" && <MoonIcon className="h-5 w-5 text-blue-500" />}
      {theme === "system" && <LaptopIcon className="h-5 w-5 text-gray-500" />}
    </button>
  );

  const menuItems = [
    <button
      key="light"
      className="group flex items-center justify-between w-full px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => setTheme("light")}
    >
      <span>Light</span>
      <SunIcon className="mr-2 h-5 w-5 text-yellow-500" />
    </button>,
    <button
      key="dark"
      className="group flex items-center justify-between w-full px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => setTheme("dark")}
    >
      <span>Dark</span>
      <MoonIcon className="mr-2 h-5 w-5 text-blue-500" />
    </button>,
    <button
      key="system"
      className="group flex items-center justify-between w-full px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => setTheme("system")}
    >
      <span>System</span>
      <LaptopIcon className="mr-2 h-5 w-5 text-gray-500" />
    </button>,
  ];

  return <Dropdown trigger={trigger} menu={menuItems} />;
}
