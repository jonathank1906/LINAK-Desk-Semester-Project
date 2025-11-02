import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Metrics() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Employee Metrics</h1>
                <div className="flex items-center gap-2">
                    <Badge>Team: All</Badge>
                    <Button variant="ghost" size="sm">Refresh</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Productivity
                            <span className="text-sm text-muted-foreground">last 7d</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-24 rounded-md bg-slate-100 animate-pulse" />
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Avg/Day</span>
                            <strong>34</strong>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Attendance
                            <span className="text-sm text-muted-foreground">today</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-24 rounded-md bg-slate-100 animate-pulse" />
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Present</span>
                            <strong>128</strong>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Satisfaction
                            <span className="text-sm text-muted-foreground">survey</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-24 rounded-md bg-slate-100 animate-pulse" />
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">NPS</span>
                            <strong>+42</strong>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-56 rounded-md bg-slate-100 animate-pulse" />
                        <div className="mt-4 flex gap-2">
                            <div className="w-24 h-8 rounded bg-slate-200 animate-pulse" />
                            <div className="w-24 h-8 rounded bg-slate-200 animate-pulse" />
                            <div className="w-24 h-8 rounded bg-slate-200 animate-pulse" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <div className="w-full flex justify-end">
                            <Button variant="outline" size="sm">View details</Button>
                        </div>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Updates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded bg-slate-100 animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                                    <div className="mt-2 h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded bg-slate-100 animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
                                    <div className="mt-2 h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded bg-slate-100 animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                                    <div className="mt-2 h-3 w-2/5 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last updated: just now</span>
                <div className="flex gap-2">
                    <Button size="sm">Export</Button>
                    <Button variant="ghost" size="sm">Settings</Button>
                </div>
            </div>
        </div>
    );
}