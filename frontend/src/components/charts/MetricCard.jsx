import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({ title, description, children, className = "" }) {
  return (
    <Card className={`${className} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
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
