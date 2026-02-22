'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import type { RatingDistributionItem } from '@/types/stats';

interface RatingsHistogramProps {
    data: RatingDistributionItem[];
    averageRating: number | null;
}

export function RatingsHistogram({ data, averageRating }: RatingsHistogramProps) {
    const hasRatings = data.some((d) => d.count > 0);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                        Ratings Distribution
                        {averageRating !== null && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                avg {averageRating.toFixed(1)}
                            </span>
                        )}
                    </CardTitle>
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" className="focus:outline-none">
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Distribution of your ratings from 1-10</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                {!hasRatings ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No ratings yet
                    </p>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                            <XAxis
                                dataKey="rating"
                                tick={{ fontSize: 12, fill: '#ffffff' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 12, fill: '#ffffff' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <RechartsTooltip
                                contentStyle={{
                                    background: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                }}
                                labelFormatter={(v) => `Rating: ${v}`}
                                formatter={(v) => [v as number, 'Films']}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                {data.map((entry) => (
                                    <Cell
                                        key={entry.rating}
                                        fill={entry.count > 0 ? '#e07534' : 'hsl(var(--muted))'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
