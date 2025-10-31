"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
    session: Session | null;
    user: User | null;
    loading: boolean;
    refresh: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const supabase = createSupabaseClient();
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (!mounted) return;
                const current = data.session ?? null;
                setSession(current);
                setUser(current?.user ?? null);
                try {
                    const token = current?.access_token;
                    if (token) {
                        localStorage.setItem("auth-token", token);
                        sessionStorage.setItem("auth-token", token);
                    } else {
                        localStorage.removeItem("auth-token");
                        sessionStorage.removeItem("auth-token");
                    }
                } catch {}
            } finally {
                if (mounted) setLoading(false);
            }
        };
        init();
        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            try {
                const token = newSession?.access_token;
                if (token) {
                    localStorage.setItem("auth-token", token);
                    sessionStorage.setItem("auth-token", token);
                } else {
                    localStorage.removeItem("auth-token");
                    sessionStorage.removeItem("auth-token");
                }
            } catch {}
        });
        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, [supabase]);

    const refresh = async () => {
        const { data } = await supabase.auth.getSession();
        const current = data.session ?? null;
        setSession(current);
        setUser(current?.user ?? null);
        try {
            const token = current?.access_token;
            if (token) {
                localStorage.setItem("auth-token", token);
                sessionStorage.setItem("auth-token", token);
            } else {
                localStorage.removeItem("auth-token");
                sessionStorage.removeItem("auth-token");
            }
        } catch {}
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        try {
            localStorage.removeItem("auth-token");
            sessionStorage.removeItem("auth-token");
        } catch {}
        await refresh();
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, refresh, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
    return ctx;
}
