"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EditNameDialog } from "./_components/edit-name-dialog";
import { ResetPasswordDialog } from "./_components/reset-password-dialog";
import { api } from "@/trpc/react";
import AccountPageSkeleton from "./_components/page-skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AccountPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = api.user.getUser.useQuery();

  if (!isLoading && (isError || !user)) {
    router.push("/login");
    return null; // Or a loading spinner/message
  }

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .filter(Boolean) // Get first two words
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user?.email
      ? user.email[0]?.toUpperCase()
      : "U"; // Default to 'U' for unknown

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg space-y-6",
        isMobile ? "px-4 py-4 pb-20" : "p-8 pb-16",
      )}
    >
      {!isMobile && (
        <h2 className="text-xl font-medium tracking-tight">My Account</h2>
      )}

      {isLoading ? (
        <AccountPageSkeleton />
      ) : (
        <>
          <Card className="w-full max-w-2xl p-0">
            <CardContent className="flex items-center space-x-4 p-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary text-xl text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium">{user?.name ?? ""}</p>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="name"
                  value={user?.name ?? ""}
                  readOnly
                  className="flex-1"
                />
                <EditNameDialog
                  currentName={user?.name ?? ""}
                  onSuccess={async () => {
                    await refetch();
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                defaultValue={user?.email ?? ""}
                readOnly
                className="flex-1"
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <p className="text-muted-foreground text-sm">
                You can set a permanent password if you {"don't"} want to use
                temporary login codes
              </p>
              <ResetPasswordDialog
                onSuccess={async () => {
                  await refetch();
                }}
              />
            </div>
          </div>

          {/* Logout button for mobile */}
          {isMobile && (
            <>
              <Separator className="my-6" />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
