import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCardPreview() {
  return (
    <Card className="group">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-12 mb-1" />
                <div className="bg-muted/50 p-3 rounded border-l-2 border-blue-200">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <div>
                <Skeleton className="h-4 w-12 mb-1" />
                <div className="bg-muted/50 p-3 rounded border-l-2 border-green-200">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </div>
          </div>
          
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonStudyCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="p-4 bg-muted/50 rounded-lg">
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonStatCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function SkeletonActionCard() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-10 w-full rounded mt-4" />
      </CardContent>
    </Card>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Study Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonActionCard key={i} />
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}