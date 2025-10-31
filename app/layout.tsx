import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ReactQueryProvider } from "@/lib/react-query/provider";
import { FeatureFlagsProvider } from "@/context/feature-flags-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ReactQueryProvider>
          <AuthProvider>
            <FeatureFlagsProvider>
              {children}
            </FeatureFlagsProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}