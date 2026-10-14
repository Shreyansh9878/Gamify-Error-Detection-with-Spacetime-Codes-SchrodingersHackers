import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Quantum Shield — Protect the signal",
  description:
    "Learn quantum noise and low-overhead spacetime error detection through ten interactive Qiskit missions.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
