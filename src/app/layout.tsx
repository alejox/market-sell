import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ventex Marketing — Estratega",
  description:
    "Espacio de trabajo del estratega de marketing de Ventex: propuestas de campaña para revisión y aprobación del propietario.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        {children}
      </body>
    </html>
  );
}
