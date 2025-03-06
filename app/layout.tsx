import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/hooks/ThemeProvider";

const Pop = Poppins({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HostelHive",
  description: "Get to know your hostel better",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${Pop.className} antialiased`}>
          <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
