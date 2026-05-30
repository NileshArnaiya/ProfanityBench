import "./globals.css";

export const metadata = {
  title: "GaaliGPT — The World's Spiciest Profanity Engine",
  description:
    "Search 100,000+ curse words, insults, and profanity from every language and dialect on earth.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
