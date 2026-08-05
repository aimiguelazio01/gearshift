import type { Metadata } from "next";
import "./globals.css";
import AppProvider from "@/components/AppProvider";
import MainLayout from "@/components/MainLayout";

export const metadata: Metadata = {
  title: "GEARSHIFT AUTOMOTIVE — Workshop Management System",
  description: "Gearshift Automotive - Professional automotive workshop management system. Service, Repair & Diagnostics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-mesh">
        <AppProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </AppProvider>
      </body>
    </html>
  );
}
