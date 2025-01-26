import type { Metadata } from "next";
import { Poppins } from "next/font/google";

const Pop = Poppins({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Super Admin Dashboard | HostelHive",
  description: "Get to know your hostel better",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${Pop.className} antialiased`}>{children}</body>
    </html>
  );
}
