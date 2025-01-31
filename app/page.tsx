"use client";

import { CircleUser, AtSign, Key } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center">
      <p className="text-center text-gray-600 text-sm mb-6 w-1/6">
        Enter your credentials to access your account.
      </p>
      <form action="" className="relative flex flex-col w-1/2 items-center">
        <div className="flex w-1/2 p-2 gap-2 items-center border-2 rounded-xl">
          <AtSign className="w-6 h-6 text-gray-500" />
          <input
            type="text"
            className="outline-none bg-transparent"
            placeholder="College email"
          />
        </div>
        <div className="flex w-1/2 p-2 gap-2 items-center border-2 rounded-xl mt-2">
          <Key className="w-6 h-6 text-gray-500" />
          <input
            type="password"
            className="outline-none bg-transparent"
            placeholder="Password"
          />
        </div>
        <p className="text-xs p-0.5 w-1/2">
          For new student password is their registration number
        </p>
        <button className="bg-black hover:bg-black/80 text-white cursor-pointer rounded-lg px-4 py-2 mt-2 w-1/2">
          Sign In
        </button>
      </form>
    </div>
  );
}
