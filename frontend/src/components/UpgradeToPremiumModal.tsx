'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Search, BarChart3, FolderOpen } from 'lucide-react';

interface UpgradeToPremiumModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feature?: 'insights' | 'search' | 'groups';
}

export function UpgradeToPremiumModal({
    open,
    onOpenChange,
    feature = 'insights'
}: UpgradeToPremiumModalProps) {

    const featureMessages = {
        insights: 'AI Insights help you remember your personal journey with each film.',
        search: 'AI Search lets you find watches using natural language queries.',
        groups: 'Create and join unlimited groups to share your movie watching experience.',
    };

    const handleUpgrade = () => {
        // TODO: Navigate to billing/upgrade page
        // For now, just close the modal
        console.log('Navigate to upgrade page');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Upgrade to Premium
                    </DialogTitle>
                    <DialogDescription>
                        {featureMessages[feature]}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Premium Features List */}
                    <div>
                        <h4 className="font-semibold mb-3 text-sm">Premium Features:</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">AI-Powered Personalised Insights</p>
                                    <p className="text-xs text-muted-foreground">
                                        Combine movie plots with your viewing history, ratings, and notes
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <Search className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Natural Language Search</p>
                                    <p className="text-xs text-muted-foreground">
                                        Find watches using queries like "thriller I watched last summer"
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Advanced Statistics</p>
                                    <p className="text-xs text-muted-foreground">
                                        Detailed viewing patterns and analytics
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <FolderOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Unlimited Groups</p>
                                    <p className="text-xs text-muted-foreground">
                                        Create and join as many groups as you want
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Pricing */}
                    <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-bold text-primary">£5</span>
                            <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-lg font-semibold">£50</span>
                            <span className="text-sm text-muted-foreground">/year</span>
                            <span className="text-xs text-primary font-medium ml-2">Save 17%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Cancel anytime • No hidden fees</p>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleUpgrade}
                        className="w-full sm:w-auto"
                    >
                        Upgrade Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}