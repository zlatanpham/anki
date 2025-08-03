import "@/styles/globals.css";

import { HydrateClient } from "@/trpc/server";
import { OrganizationProvider } from "./_context/organization";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { MobileLayoutWrapper } from "@/components/mobile-layout-wrapper";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <OrganizationProvider>
      <HydrateClient>
        <MobileLayoutWrapper>
          {children}
        </MobileLayoutWrapper>
      </HydrateClient>
    </OrganizationProvider>
  );
}
