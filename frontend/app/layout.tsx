import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import FeedbackButton from "@/components/FeedbackButton";

export const metadata: Metadata = {
  title: "SDD Navigator | Precision Research Roadmapping",
  description:
    "The global research roadmap platform — connect your assets to your goals with AI-powered guidance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="font-body-md text-body-md bg-background text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
        <AuthProvider>
          {children}
          <FeedbackButton />
        </AuthProvider>
      </body>
    </html>
  );
}
