import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polla Mundial 2026",
  description: "Juego de Pronósticos Oficial - Creador: Alejandro Rodriguez",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* FontAwesome Link */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          precedence="default"
        />
        {/* Outfit Font */}
        <link 
          rel="preconnect" 
          href="https://fonts.googleapis.com" 
        />
        <link 
          rel="preconnect" 
          href="https://fonts.gstatic.com" 
          crossOrigin="anonymous" 
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
