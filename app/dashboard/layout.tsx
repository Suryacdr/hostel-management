import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/hooks/ThemeProvider";

const Pop = Poppins({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HostelHive - Dashboard",
  description: "Get to know your hostel better",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${Pop.className} antialiased`}>
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  );
}
