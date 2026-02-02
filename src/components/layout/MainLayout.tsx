import { ReactNode } from "react";
import { TopNav, SectionNav } from "./TopNav";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <SectionNav />
          {children}
        </div>
      </main>
    </div>
  );
}
