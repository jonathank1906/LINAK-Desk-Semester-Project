import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({ title, description, children, className = "" }) {
  return (
    <Card className="animate-fade-up animation-delay-200">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
