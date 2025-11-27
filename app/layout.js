import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Elíneas - Plataforma de inventario y reabastecimiento",
  description:
    "Sistema inteligente para la gestión de inventario y reabastecimiento",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
