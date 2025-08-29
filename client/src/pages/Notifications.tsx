import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery<any[]>({
    queryKey: [`/api/users/${user?.id}/notifications`],
    enabled: !!user?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/notifications/${notificationId}/read`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${user?.id}/notifications`],
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task":
        return "✅";
      case "payment":
        return "💰";
      case "subscription":
        return "👑";
      case "system":
        return "🔔";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "task":
        return "border-success";
      case "payment":
        return "border-warning";
      case "subscription":
        return "border-accent";
      case "system":
        return "border-primary";
      default:
        return "border-muted";
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">🔔 Notifications</h1>
          <p className="text-muted-foreground">Keeping an open ear(🦻🏼)</p>
        </div>

        <div className="space-y-4">
          {notifications?.length > 0 ? (
            notifications.map((notification: any) => (
              <Card
                key={notification.id}
                className={`border-l-4 ${getNotificationColor(notification.type)} ${
                  !notification.isRead ? "bg-muted/20" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm md:text-base">
                            {notification.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(
                              notification.createdAt,
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(
                              notification.createdAt,
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {!notification.isRead && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() =>
                                markReadMutation.mutate(notification.id)
                              }
                              disabled={markReadMutation.isPending}
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-6xl mb-4">🔔</div>
                <h3 className="text-lg font-semibold mb-2">
                  No notifications yet
                </h3>
                <p className="text-muted-foreground">
                  All your notifications will be listed here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
