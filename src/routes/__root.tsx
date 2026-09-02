import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, minimal-ui",
      },
      { name: "theme-color", content: "#1a1428" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Echo Vanguards" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "Echo Vanguards" },
      { name: "msapplication-TileColor", content: "#1a1428" },
      { name: "msapplication-tap-highlight", content: "no" },
      { name: "format-detection", content: "telephone=no" },
      { name: "description", content:
          "Survive endless zombie waves. Your gun auto-tracks up close — hold fire to aim yourself. Past runs return as Echoes to fight beside you.",
      },
      { name: "author", content: "Echo Vanguards" },
      { property: "og:title", content: "Echo Vanguards" },
      {
        property: "og:description",
        content:
          "Survive endless zombie waves. Your gun auto-tracks up close — hold fire to aim yourself. Past runs return as Echoes to fight beside you.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Echo Vanguards" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bungee&family=Nunito:wght@400;700;900&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-startup-image", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Register service worker for offline support + app store installability
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          /* SW registration failed — non-critical, app still works */
        });
    }

    // Prevent iOS rubber-band bounce overscroll
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    // Prevent pull-to-refresh and bounce on mobile
    const preventBounce = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      const el = e.target as HTMLElement;
      // Allow scrolling within scrollable panels/menus
      let scrollable = el;
      while (scrollable && scrollable !== document.body) {
        if (
          scrollable.scrollHeight > scrollable.clientHeight &&
          getComputedStyle(scrollable).overflowY !== "visible"
        ) {
          return;
        }
        scrollable = scrollable.parentElement!;
      }
      if (window.scrollY === 0 && e.touches[0]!.clientY > 0) {
        // At top, pulling down — prevent bounce
      }
    };
    document.addEventListener("touchmove", preventBounce, { passive: true });

    // Pause game when tab is hidden (saves battery, prevents dt spikes)
    const onVisChange = () => {
      if (document.hidden) {
        // Dispatch a custom event the game loop can listen to
        window.dispatchEvent(new CustomEvent("echo-pause"));
      }
    };
    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      document.removeEventListener("touchmove", preventBounce);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
