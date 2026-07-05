import { UserProfile } from '../types';

export type TourRole = 'student' | 'parent' | 'teacher';

export interface TourOfferDecision {
  profileUpdates: Partial<UserProfile>;
  shouldShowTour: boolean;
  tourRole: TourRole | null;
  /** Set session ref so tour shows after placement in this session */
  deferTourAfterPlacement: boolean;
  /** Clear deferred flag after offering tour on a later login */
  clearDeferredTour: boolean;
}

function tourFieldForRole(role: UserProfile['role']): keyof UserProfile | null {
  if (role === 'parent') return 'hasCompletedParentTour';
  if (role === 'teacher') return 'hasCompletedTeacherTour';
  if (role === 'student') return 'hasCompletedStudentTour';
  return null;
}

/**
 * True when this session should be treated as the account's first login for tour purposes.
 * Parents/teachers are often provisioned with isFirstTime but may lack hasLoggedInBefore.
 */
export function isFirstLoginForTour(profileData: UserProfile): boolean {
  if (profileData.hasLoggedInBefore === false) return true;
  if (profileData.hasLoggedInBefore === true) return false;

  const tourField = tourFieldForRole(profileData.role);
  if (!tourField || profileData[tourField]) return false;

  // Provisioned parent/teacher accounts before first real visit
  if (
    (profileData.role === 'parent' || profileData.role === 'teacher') &&
    profileData.isFirstTime
  ) {
    return true;
  }

  return false;
}

/**
 * Pure decision for optional first-login tour.
 * Returns null when this login should not change tour state (demo / already handled).
 */
export function decideFirstLoginTourOffer(
  profileData: UserProfile,
  resultsCount: number,
  alreadyHandled: boolean
): TourOfferDecision | null {
  if (profileData.isDemo || alreadyHandled) return null;

  if (isFirstLoginForTour(profileData)) {
    const tourField = tourFieldForRole(profileData.role);
    const needsPlacement =
      profileData.role === 'student' && profileData.isFirstTime && resultsCount === 0;
    const shouldOfferTour = !!(tourField && !profileData[tourField] && !needsPlacement);
    const deferTourAfterPlacement = !!(needsPlacement && tourField && !profileData[tourField]);

    return {
      profileUpdates: {
        hasLoggedInBefore: true,
        ...(deferTourAfterPlacement ? { offerTourAfterPlacement: true } : {}),
      },
      shouldShowTour: shouldOfferTour,
      tourRole: shouldOfferTour ? (profileData.role as TourRole) : null,
      deferTourAfterPlacement,
      clearDeferredTour: false,
    };
  }

  if (
    profileData.offerTourAfterPlacement &&
    profileData.role === 'student' &&
    !profileData.hasCompletedStudentTour &&
    resultsCount > 0
  ) {
    // Flag is cleared when the tour actually starts (after leaving Stats)
    return {
      profileUpdates: {},
      shouldShowTour: true,
      tourRole: 'student',
      deferTourAfterPlacement: false,
      clearDeferredTour: true,
    };
  }

  if (profileData.hasLoggedInBefore !== true) {
    // Legacy accounts without first-login markers — skip auto tour
    return {
      profileUpdates: { hasLoggedInBefore: true },
      shouldShowTour: false,
      tourRole: null,
      deferTourAfterPlacement: false,
      clearDeferredTour: false,
    };
  }

  return {
    profileUpdates: {},
    shouldShowTour: false,
    tourRole: null,
    deferTourAfterPlacement: false,
    clearDeferredTour: false,
  };
}

/** Whether to show tour immediately after placement completes in the same session. */
export function shouldOfferTourAfterPlacementComplete(input: {
  testType: string;
  role?: string;
  isDemo?: boolean;
  hasCompletedStudentTour?: boolean;
  pendingTourAfterPlacement: boolean;
  offerTourAfterPlacement?: boolean;
}): boolean {
  return (
    input.testType === 'placement' &&
    input.role === 'student' &&
    !input.isDemo &&
    !input.hasCompletedStudentTour &&
    (input.pendingTourAfterPlacement || input.offerTourAfterPlacement === true)
  );
}
