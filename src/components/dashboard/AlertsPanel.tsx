import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, TrendingDown, Calendar } from "lucide-react";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export const AlertsPanel = ({ alerts }: AlertsPanelProps) => {
  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-danger" />;
      case "warning":
        return <TrendingDown className="h-5 w-5 text-warning" />;
      case "info":
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  const getAlertBadgeVariant = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };

  const criticalAlerts = alerts.filter((a) => a.type === "critical");
  const warningAlerts = alerts.filter((a) => a.type === "warning");
  const infoAlerts = alerts.filter((a) => a.type === "info");

  return (
    <Card className="h-fit sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          🔔 Alertas e Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {criticalAlerts.length} CRÍTICO{criticalAlerts.length > 1 ? "S" : ""}
              </Badge>
            </div>
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-danger-light border-l-4 border-danger rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                {alert.action && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={alert.action.onClick}
                      className="h-7 text-xs"
                    >
                      {alert.action.label}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      Ignorar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warning Alerts */}
        {warningAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">
                {warningAlerts.length} ATENÇÃO
              </Badge>
            </div>
            {warningAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-warning-light border-l-4 border-warning rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                {alert.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={alert.action.onClick}
                    className="h-7 text-xs w-full"
                  >
                    {alert.action.label}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Alerts */}
        {infoAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {infoAlerts.length} INFORMATIVO
              </Badge>
            </div>
            {infoAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-info-light border-l-4 border-info rounded-lg p-3 space-y-1"
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum alerta no momento</p>
            <p className="text-xs mt-1">Tudo está funcionando bem! ✅</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
