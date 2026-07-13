'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut } from 'lucide-react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';

export default function OnboardingPage() {
  const { authLoading, isSubmitting, form, handleSignOut, onSubmit } = useOnboarding();

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Welcome! Set Up Your Store</CardTitle>
              <CardDescription>
                Please provide some basic information about your business to get started.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <OnboardingForm form={form} isSubmitting={isSubmitting} onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
