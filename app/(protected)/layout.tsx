"use client";
import { ReactNode, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { session, loading } = useAuth();

    useEffect(() => {
        if (!loading && !session) {
            router.replace("/login");
        }
    }, [loading, session, router]);

    if (loading || (!session)) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Validando sesión...
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col p-4 lg:p-6 gap-4">
                    {children}
                </div>
            </SidebarInset>
            <Toaster richColors position="top-right" />
        </SidebarProvider>
    );
}
