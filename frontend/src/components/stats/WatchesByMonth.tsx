'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { WatchesByMonthItem } from '@/types/stats';

interface WatchesByMonthProps {
    data: WatchesByMonthItem[];
}

export function WatchesByMonth({ data }: WatchesByMonthProps) {
    const currentYear = new Date().getFullYear();
    const hasActivity = data.some((d) => d.count > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {currentYear} Activity
                    {!hasActivity && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            no watches yet this year
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                        <XAxis
                            dataKey="monthName"
                            tick={{ fontSize: 11, fill: '#ffffff' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 12, fill: '#ffffff' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                fontSize: '13px',
                            }}
                            formatter={(v) => [v as number, 'Watches']}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="count" fill="#e07534" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
