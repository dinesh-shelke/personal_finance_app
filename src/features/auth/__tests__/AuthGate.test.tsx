import type { Session } from '@supabase/supabase-js';
import { act, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AuthGate } from '../AuthGate';
import { useSession } from '../SessionProvider';

/**
 * What this file guards: that AuthGate declares each screen behind the right
 * guard. A protected screen must be absent from the tree when there is no
 * session — absent, not merely redirected away from, which is what the launch
 * crash taught us the difference costs.
 *
 * What it does NOT prove: that expo-router honours `Stack.Protected`. The Stack
 * is mocked here, so the guard's semantics are assumed. That is the router's
 * contract, not ours. `AuthGate.routing.test.tsx` drives the real router for
 * the part that is ours — which screen the stack anchors on.
 */

/** Records every `Stack.Screen` AuthGate declares, in declaration order. */
const mockDeclareScreen = jest.fn<void, [string]>();

jest.mock('expo-router', () => {
  // Only React is required here. Pulling in react-native as well would give
  // the renderer a second copy of the library and RNTL stops working.
  const React = jest.requireActual<typeof import('react')>('react');

  function Stack({ children }: { children?: ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  }

  Stack.Screen = function StackScreen({ name }: { name: string }) {
    mockDeclareScreen(name);
    return null;
  };

  Stack.Protected = function StackProtected({
    guard,
    children,
  }: {
    guard: boolean;
    children?: ReactNode;
  }) {
    return guard ? React.createElement(React.Fragment, null, children) : null;
  };

  return { Stack };
});

jest.mock('../SessionProvider', () => ({ useSession: jest.fn() }));

const mockedUseSession = jest.mocked(useSession);

function signedIn(): void {
  const session = { user: { id: 'user-1' } } as unknown as Session;
  mockedUseSession.mockReturnValue({
    session,
    user: session.user,
    isLoading: false,
    signOut: jest.fn(),
  });
}

function signedOut(): void {
  mockedUseSession.mockReturnValue({
    session: null,
    user: null,
    isLoading: false,
    signOut: jest.fn(),
  });
}

/** The screens that must never exist without a session. */
const PROTECTED = ['(tabs)', 'accounts', 'categories', 'transaction'];

async function renderGate(): Promise<void> {
  // RNTL commits asynchronously under React 19, so the declarations are not
  // recorded until the tree flushes.
  await act(async () => {
    render(<AuthGate />);
  });
}

function declaredScreens(): string[] {
  return mockDeclareScreen.mock.calls.map(([name]) => name);
}

describe('AuthGate screen declarations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares no protected screen while signed out', async () => {
    signedOut();

    await renderGate();

    expect(declaredScreens()).not.toEqual(expect.arrayContaining(PROTECTED));
    for (const name of PROTECTED) {
      expect(declaredScreens()).not.toContain(name);
    }
  });

  it('declares the sign-in group while signed out', async () => {
    signedOut();

    await renderGate();

    expect(declaredScreens()).toContain('(auth)');
  });

  it('declares every protected screen once signed in', async () => {
    signedIn();

    await renderGate();

    expect(declaredScreens()).toEqual(expect.arrayContaining(PROTECTED));
  });

  it('drops the sign-in group once signed in', async () => {
    signedIn();

    await renderGate();

    expect(declaredScreens()).not.toContain('(auth)');
  });

  /**
   * The OAuth redirect arrives before the session does, so this route sits
   * outside both guards. Behind either one it would be missing exactly when
   * the browser hands control back, and sign-in would dead-end on
   * "Page not found" again.
   */
  it('keeps the OAuth callback reachable while signed out', async () => {
    signedOut();

    await renderGate();

    expect(declaredScreens()).toContain('auth/callback');
  });

  it('keeps the OAuth callback reachable once signed in', async () => {
    signedIn();

    await renderGate();

    expect(declaredScreens()).toContain('auth/callback');
  });

  /**
   * Declaration order is load-bearing, not cosmetic: the stack anchors on its
   * first declared screen when the incoming URL does not resolve to one.
   * With the callback first, every cold start opened on its spinner.
   */
  it('never declares the OAuth callback first', async () => {
    signedOut();

    await renderGate();

    expect(declaredScreens()[0]).not.toBe('auth/callback');
  });

  it('declares no route at all while the session is still loading', async () => {
    mockedUseSession.mockReturnValue({
      session: null,
      user: null,
      isLoading: true,
      signOut: jest.fn(),
    });

    await renderGate();

    expect(declaredScreens()).toHaveLength(0);
  });
});
