"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexProvider client={client}>
      {children}
    </ConvexProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </ConvexClientProvider>
  );
}
