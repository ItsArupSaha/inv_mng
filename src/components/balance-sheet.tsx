'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
    getAccountOverview, 
    getCapitalHistory, 
    deleteCapitalAdjustment, 
    getSecurityDeposits, 
    deleteSecurityDeposit 
} from '@/lib/actions';
import type { Capital, SecurityDeposit } from '@/lib/types';
import { exportBalanceSheetPdf } from './balance-sheet/balance-sheet-pdf';
import { AddCapitalDialog } from './balance-sheet/add-capital-dialog';
import { AddSecurityDialog } from './balance-sheet/add-security-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BalanceSheetKpis } from './balance-sheet/balance-sheet-kpis';
import { BalanceSheetTableCard } from './balance-sheet/balance-sheet-table-card';
import { CapitalManagementTab } from './balance-sheet/capital-management-tab';
import { SecurityDepositsTab } from './balance-sheet/security-deposits-tab';

interface BalanceSheetProps {
    userId: string;
}

type Overview = Awaited<ReturnType<typeof getAccountOverview>>;

const formatCurrency = (amount: number) =>
    `৳ ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function BalanceSheet({ userId }: BalanceSheetProps) {
    const { authUser } = useAuth();
    const { toast } = useToast();
    const [asOfDate, setAsOfDate] = React.useState<Date | undefined>(undefined);
    const [current, setCurrent] = React.useState<Overview | null>(null);
    const [capitalHistory, setCapitalHistory] = React.useState<Capital[]>([]);
    const [securityHistory, setSecurityHistory] = React.useState<SecurityDeposit[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAddCapitalOpen, setIsAddCapitalOpen] = React.useState(false);
    const [isAddSecurityOpen, setIsAddSecurityOpen] = React.useState(false);
    const [editingCapital, setEditingCapital] = React.useState<Capital | null>(null);
    const [editingSecurity, setEditingSecurity] = React.useState<SecurityDeposit | null>(null);
    const [updateTrigger, setUpdateTrigger] = React.useState(0);

    const loadData = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            let targetDate = asOfDate ?? new Date();

            if (asOfDate) {
                targetDate = new Date(asOfDate);
                targetDate.setHours(23, 59, 59, 999);
            }

            const [currentSnapshot, history, security] = await Promise.all([
                getAccountOverview(userId, targetDate),
                getCapitalHistory(userId),
                getSecurityDeposits(userId)
            ]);

            setCurrent(currentSnapshot);
            setCapitalHistory(history);
            setSecurityHistory(security);
        } catch (error) {
            console.error('Error loading overview data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, asOfDate, updateTrigger]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSuccess = () => {
        setUpdateTrigger(prev => prev + 1);
    };

    const handleCloseAddCapital = (open: boolean) => {
        setIsAddCapitalOpen(open);
        if (!open) {
            setEditingCapital(null);
        }
    };

    const handleEditCapital = (cap: Capital) => {
        setEditingCapital(cap);
        setIsAddCapitalOpen(true);
    };

    const handleDeleteCapital = async (capId: string) => {
        if (!confirm("Are you sure you want to delete this capital entry? This will immediately affect your Cash/Bank balances.")) return;
        try {
            await deleteCapitalAdjustment(userId, capId);
            toast({
                title: "Capital Record Deleted",
                description: "The capital transaction has been deleted successfully."
            });
            handleSuccess();
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error deleting capital",
                description: "Failed to delete capital transaction. Please try again."
            });
        }
    };

    const handleCloseAddSecurity = (open: boolean) => {
        setIsAddSecurityOpen(open);
        if (!open) {
            setEditingSecurity(null);
        }
    };

    const handleEditSecurity = (sec: SecurityDeposit) => {
        setEditingSecurity(sec);
        setIsAddSecurityOpen(true);
    };

    const handleDeleteSecurity = async (secId: string) => {
        if (!confirm("Are you sure you want to delete this security deposit record? This will immediately affect your Cash/Bank balances.")) return;
        try {
            await deleteSecurityDeposit(userId, secId);
            toast({
                title: "Security Deposit Deleted",
                description: "The security deposit transaction has been deleted successfully."
            });
            handleSuccess();
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error deleting security deposit",
                description: "Failed to delete security deposit. Please try again."
            });
        }
    };

    const handleDownloadPdf = () => {
        if (!current) return;
        const effectiveDate = asOfDate ?? new Date();
        exportBalanceSheetPdf(current, effectiveDate, asOfDate, authUser);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50">
            {/* KPI Overview Cards */}
            {!isLoading && current && (
                <BalanceSheetKpis current={current} formatCurrency={formatCurrency} />
            )}

            {/* Main Balance Sheet Table Card */}
            <BalanceSheetTableCard
                current={current}
                isLoading={isLoading}
                asOfDate={asOfDate}
                setAsOfDate={setAsOfDate}
                handleDownloadPdf={handleDownloadPdf}
                formatCurrency={formatCurrency}
            />

            {/* Bottom section with Tabs for Capital and Security deposits */}
            {!isLoading && current && (
                <Tabs defaultValue="capital" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
                        <TabsTrigger value="capital">Capital Management</TabsTrigger>
                        <TabsTrigger value="security">Security Deposits</TabsTrigger>
                    </TabsList>

                    <TabsContent value="capital" className="space-y-4">
                        <CapitalManagementTab
                            current={current}
                            capitalHistory={capitalHistory}
                            formatCurrency={formatCurrency}
                            onAddCapital={() => setIsAddCapitalOpen(true)}
                            onEditCapital={handleEditCapital}
                            onDeleteCapital={handleDeleteCapital}
                        />
                    </TabsContent>

                    <TabsContent value="security" className="space-y-4">
                        <SecurityDepositsTab
                            securityHistory={securityHistory}
                            formatCurrency={formatCurrency}
                            onAddSecurity={() => setIsAddSecurityOpen(true)}
                            onEditSecurity={handleEditSecurity}
                            onDeleteSecurity={handleDeleteSecurity}
                        />
                    </TabsContent>
                </Tabs>
            )}

            {/* Add Capital Form Modal */}
            <AddCapitalDialog
                userId={userId}
                isOpen={isAddCapitalOpen}
                onOpenChange={handleCloseAddCapital}
                onSuccess={handleSuccess}
                editingCapital={editingCapital}
            />

            {/* Add Security Form Modal */}
            <AddSecurityDialog
                userId={userId}
                isOpen={isAddSecurityOpen}
                onOpenChange={handleCloseAddSecurity}
                onSuccess={handleSuccess}
                editingSecurity={editingSecurity}
            />
        </div>
    );
}
