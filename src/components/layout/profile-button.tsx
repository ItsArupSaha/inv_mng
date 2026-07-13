'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function ProfileButton() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  if (user) {
    return (
      <div className="flex w-full items-center gap-3">
        <Avatar>
          <AvatarImage
            src={user.photoURL || `https://placehold.co/40x40.png`}
            alt={user.displayName || 'User'}
            data-ai-hint="person"
          />
          <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col truncate flex-1">
          <span className="font-semibold text-sm truncate" title={user.displayName || 'User'}>
            {user.displayName || 'User'}
          </span>
          <span className="text-xs text-muted-foreground truncate" title={user.email || ''}>
            {user.email}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
          <LogOut />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSignIn} className="w-full">
      <LogIn className="mr-2 h-4 w-4" /> Sign In
    </Button>
  );
}
