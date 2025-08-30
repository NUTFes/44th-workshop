import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Fireworks Admin Dashboard",
    description: "Admin dashboard for managing fireworks data",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>
        {children}
        </body>
        </html>
    );
}