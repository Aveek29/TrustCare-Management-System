'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme as useNextTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export const themes = [
  { value: 'light', label: 'Light', description: 'Clean and bright', primary: '#0ea5e9' },
  { value: 'dark', label: 'Dark', description: 'Easy on eyes', primary: '#0ea5e9' },
  { value: 'blue', label: 'Ocean Blue', description: 'Calm and trust', primary: '#2563eb' },
  { value: 'purple', label: 'Royal Purple', description: 'Premium feel', primary: '#9333ea' },
  { value: 'green', label: 'Forest', description: 'Natural care', primary: '#16a34a' },
  { value: 'rose', label: 'Rose Pink', description: 'Warm caring', primary: '#e11d48' },
  { value: 'amber', label: 'Sunset', description: 'Warm energy', primary: '#d97706' },
  { value: 'indigo', label: 'Midnight', description: 'Professional', primary: '#4f46e5' },
] as const;

export type Theme = typeof themes[number]['value'];

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  return {
    theme: (theme || 'light') as Theme,
    setTheme,
    resolvedTheme: (resolvedTheme || 'light') as Theme,
    themes,
  };
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 border">
        <Palette className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 border"
          title="Change theme"
        >
          <Palette className="h-5 w-5" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">Choose Theme</div>
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              "flex items-center gap-3 cursor-pointer py-2.5 px-2 rounded-md mx-1 my-0.5",
              theme === t.value && "bg-accent"
            )}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm"
              style={{ backgroundColor: t.primary }}
            >
              {theme === t.value && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
      themes={themes.map(t => t.value)}
    >
      {children}
    </NextThemesProvider>
  );
}
