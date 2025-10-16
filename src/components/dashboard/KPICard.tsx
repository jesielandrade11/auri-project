import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  trend?: {
    value: number;
    label: string;
  };
  icon: React.ReactNode;
  variant?: "success" | "danger" | "info" | "default";
}

export const KPICard = ({ title, value, trend, icon, variant = "default" }: KPICardProps) => {
  const getColorClasses = () => {
    switch (variant) {
      case "success":
        return "bg-success/10 text-success border-success/20";
      case "danger":
        return "bg-danger/10 text-danger border-danger/20";
      case "info":
        return "bg-info/10 text-info border-info/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn("p-2 rounded-lg border", getColorClasses())}>
            {icon}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-3xl font-bold">{value}</p>
          
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              {trend.value > 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-danger" />
              )}
              <span className={cn(
                "font-medium",
                trend.value > 0 ? "text-success" : "text-danger"
              )}>
                {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
