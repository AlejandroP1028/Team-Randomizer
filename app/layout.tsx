import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { Fira_Code } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Rail } from "@/components/Rail";

const onest = Onest({ subsets: ["latin"], variable: "--font-sans" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Team Randomizer",
  description: "Generate balanced teams from a list of participants",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${onest.variable} ${firaCode.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-screen overflow-hidden">
            <Rail />
            <main className="flex-1 overflow-hidden min-w-0">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
