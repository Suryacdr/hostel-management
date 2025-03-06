import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import { LogOut } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="h-screen flex flex-col dark:bg-black dark:text-white">
      {/* profile */}
      <div className="p-5 px-20 pb-5 flex justify-between border-b-2 rounded-b-2xl">
        <div className="flex items-center gap-3 w-full ">
          <div className="w-[200px] h-[200px] rounded-full overflow-hidden">
            <Image
              src={"/test.jpeg"}
              objectFit="cover"
              width={200}
              height={200}
              alt="Profile"
            />
          </div>
          <div className="w-1/2">
            <span>
              <h2 className="text-2xl font-bold">Grenish Rai</h2>
              <h2 className="text-lg">202216052</h2>
            </span>
            <p className="text-md opacity-40">
              grenish_202216052@smit.smu.edu.in
            </p>
            <div className="flex gap-2">
              <div className="bg-gray-200 dark:bg-slate-900 p-2 rounded-xl w-1/4 mt-2 text-center">
                <p className="text-xl font-semibold">BCA</p>
                <p className="text-sm">Course</p>
              </div>
              <div className="bg-gray-200 dark:bg-slate-900 p-2 rounded-xl  w-1/4 mt-2 text-center">
                <p className="text-xl font-semibold">CA</p>
                <p className="text-sm">Dept</p>
              </div>
              <div className="bg-gray-200 dark:bg-slate-900 p-2 rounded-xl  w-1/4 mt-2 text-center">
                <p className="text-xl font-semibold">Q-502</p>
                <p className="text-sm">Room</p>
              </div>
              <ThemeToggle />
            </div>
            <button className="cursor-pointer">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex p-2 gap-2 overflow-hidden relative">
        {/* feed */}
        <div className="w-1/2 overflow-y-auto p-2">
          <div className="space-y-4">
            <div className="">
              <div className="bg-gray-200 dark:bg-slate-800 rounded-xl">
                <input
                  type="text"
                  placeholder="Have any complaints or maintenance?"
                  className="outline-hidden w-full p-2 bg-transparent"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="text-red-500 border-2 border-red-500 rounded-xl p-2 hover:bg-red-500/20 text-sm cursor-pointer">
                    Complaint
                  </button>
                  <button className="text-blue-500 border-2 border-blue-500 rounded-xl p-2 hover:bg-blue-500/20 text-sm cursor-pointer">
                    Maintenance
                  </button>
                </div>
                <div className="">
                  <button className="cursor-pointer p-2 text-sm bg-black text-white rounded-xl px-5">
                    Post
                  </button>
                </div>
              </div>
            </div>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <MessageBox key={item} />
            ))}
          </div>
        </div>
        {/* Warning */}
        <div className="w-1/2 ">
          <div className=" w-full border rounded-xl p-2 mb-2 bg-white">
            <h2>Dot</h2>
          </div>
          <div className="w-full border rounded-xl p-2">
            {/* Additional content can go here */}
          </div>
        </div>
      </div>
    </div>
  );
}

const MessageBox = () => {
  return (
    <div className="bg-gray-100 dark:bg-slate-900 p-2 rounded-xl relative">
      <div className="flex items-center gap-2">
        <Image
          src={"/test.jpeg"}
          width={40}
          height={40}
          alt="profile"
          objectFit="cover"
          className="rounded-full"
        />
        <span>
          <h2>Grenish Rai</h2>
          <p className="text-xs">2 days ago</p>
        </span>
      </div>
      <div className="mt-2">
        <p className="text-sm">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Sequi aut
          porro, expedita impedit voluptates necessitatibus asperiores. Deleniti
          fugiat necessitatibus eaque minima architecto quas?
        </p>
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <div className="text-red-500 border-2 rounded-xl p-1 bg-red-500/20 text-xs cursor-pointer select-none">
            Complaint
          </div>
          <div className="text-green-500 border-2 rounded-xl p-1 bg-green-500/20 text-xs cursor-pointer select-none">
            Solved
          </div>
        </div>
      </div>
    </div>
  );
};
