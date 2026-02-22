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
} from 'recharts';
import type { GenreItem } from '@/types/stats';

interface FavoriteGenresProps {
    data: GenreItem[];
}

export function FavoriteGenres({ data }: FavoriteGenresProps) {
    if (!data.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Favorite Genres</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No genre data yet
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Favorite Genres</CardTitle>
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" className="focus:outline-none">
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Your most-watched movie genres</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                        <XAxis
                            dataKey="genre"
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
                            labelFormatter={(v) => `Genre: ${v}`}
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
