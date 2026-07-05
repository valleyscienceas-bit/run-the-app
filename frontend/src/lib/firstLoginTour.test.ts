import { describe, expect, it } from 'vitest';
import { decideFirstLoginTourOffer, isFirstLoginForTour, shouldOfferTourAfterPlacementComplete } from './firstLoginTour';
import { UserProfile } from '../types';

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'u1',
    name: 'Test',
    username: 'test',
    email: 't@example.com',
    role: 'student',
    path: 'individual',
    grade: '8',
    xp: 0,
    isFirstTime: true,
    isPaid: false,
    createdAt: '2026-01-01',
    hasLoggedInBefore: false,
    ...overrides,
  };
}

describe('decideFirstLoginTourOffer', () => {
  it('returns null for demo accounts', () => {
    expect(decideFirstLoginTourOffer(baseProfile({ isDemo: true }), 0, false)).toBeNull();
  });

  it('returns null when already handled this session', () => {
    expect(decideFirstLoginTourOffer(baseProfile(), 0, true)).toBeNull();
  });

  it('defers student tour when placement is still needed', () => {
    const decision = decideFirstLoginTourOffer(baseProfile(), 0, false);
    expect(decision).toMatchObject({
      shouldShowTour: false,
      deferTourAfterPlacement: true,
      profileUpdates: { hasLoggedInBefore: true, offerTourAfterPlacement: true },
    });
  });

  it('offers parent tour immediately on first login', () => {
    const decision = decideFirstLoginTourOffer(
      baseProfile({ role: 'parent', isFirstTime: true, hasLoggedInBefore: false }),
      0,
      false
    );
    expect(decision).toMatchObject({
      shouldShowTour: true,
      tourRole: 'parent',
      deferTourAfterPlacement: false,
      profileUpdates: { hasLoggedInBefore: true },
    });
  });

  it('offers parent tour when provisioned without hasLoggedInBefore flag', () => {
    const decision = decideFirstLoginTourOffer(
      baseProfile({
        role: 'parent',
        isFirstTime: true,
        hasLoggedInBefore: undefined,
        hasCompletedParentTour: undefined,
      }),
      0,
      false
    );
    expect(isFirstLoginForTour(baseProfile({
      role: 'parent',
      isFirstTime: true,
      hasLoggedInBefore: undefined,
    }))).toBe(true);
    expect(decision).toMatchObject({
      shouldShowTour: true,
      tourRole: 'parent',
      profileUpdates: { hasLoggedInBefore: true },
    });
  });

  it('offers teacher tour immediately on first login', () => {
    const decision = decideFirstLoginTourOffer(
      baseProfile({ role: 'teacher', isFirstTime: false }),
      0,
      false
    );
    expect(decision?.shouldShowTour).toBe(true);
    expect(decision?.tourRole).toBe('teacher');
  });

  it('does not offer tour if already completed', () => {
    const decision = decideFirstLoginTourOffer(
      baseProfile({ role: 'parent', hasCompletedParentTour: true, isFirstTime: false }),
      0,
      false
    );
    expect(decision?.shouldShowTour).toBe(false);
    expect(decision?.profileUpdates.hasLoggedInBefore).toBe(true);
  });

  it('offers deferred student tour on later login after placement', () => {
    const decision = decideFirstLoginTourOffer(
      baseProfile({
        hasLoggedInBefore: true,
        offerTourAfterPlacement: true,
        isFirstTime: false,
      }),
      1,
      false
    );
    expect(decision).toMatchObject({
      shouldShowTour: true,
      tourRole: 'student',
      clearDeferredTour: true,
      profileUpdates: {},
    });
  });

  it('marks legacy accounts without showing tour', () => {
    const decision = decideFirstLoginTourOffer(
      baseProfile({ hasLoggedInBefore: undefined, isFirstTime: false }),
      2,
      false
    );
    expect(decision).toMatchObject({
      shouldShowTour: false,
      profileUpdates: { hasLoggedInBefore: true },
    });
  });

  it('does nothing on subsequent logins', () => {
    const decision = decideFirstLoginTourOffer(
      baseProfile({ hasLoggedInBefore: true, isFirstTime: false }),
      3,
      false
    );
    expect(decision).toMatchObject({
      shouldShowTour: false,
      profileUpdates: {},
    });
  });
});

describe('shouldOfferTourAfterPlacementComplete', () => {
  it('offers tour when pending in session', () => {
    expect(
      shouldOfferTourAfterPlacementComplete({
        testType: 'placement',
        role: 'student',
        pendingTourAfterPlacement: true,
      })
    ).toBe(true);
  });

  it('offers tour when persisted flag is set', () => {
    expect(
      shouldOfferTourAfterPlacementComplete({
        testType: 'placement',
        role: 'student',
        pendingTourAfterPlacement: false,
        offerTourAfterPlacement: true,
      })
    ).toBe(true);
  });

  it('does not offer for unit tests', () => {
    expect(
      shouldOfferTourAfterPlacementComplete({
        testType: 'unit',
        role: 'student',
        pendingTourAfterPlacement: true,
      })
    ).toBe(false);
  });

  it('does not offer if tour already completed', () => {
    expect(
      shouldOfferTourAfterPlacementComplete({
        testType: 'placement',
        role: 'student',
        hasCompletedStudentTour: true,
        pendingTourAfterPlacement: true,
      })
    ).toBe(false);
  });
});
