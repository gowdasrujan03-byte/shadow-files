
import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "SHADOW FILES | Real World Multiplayer",
  description:
    "Bring your friends together. Explore outdoor missions, discover clues and hunt the Shadow in SHADOW FILES.",
  applicationName: "SHADOW FILES",
  keywords: [
    "Shadow Files",
    "Outdoor Multiplayer",
    "GPS Games",
    "Mystery Games",
    "Real World Gaming"
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
