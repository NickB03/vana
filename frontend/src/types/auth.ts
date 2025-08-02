/**
 * Authentication types for the Vana application
 * Supports Firebase Auth integration and guest mode
 */

export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string | null;
  /** Display name */
  displayName: string | null;
  /** Profile image URL */
  photoURL: string | null;
  /** Whether the user's email is verified */
  emailVerified: boolean;
  /** Whether this is a guest user */
  isGuest: boolean;
  /** User creation timestamp */
  createdAt: string;
  /** User last sign-in timestamp */
  lastSignInAt: string | null;
}

export interface AuthError {
  /** Error code from Firebase or custom */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  displayName?: string;
}

export interface AuthState {
  /** Current authenticated user */
  user: User | null;
  /** Authentication loading state */
  isLoading: boolean;
  /** Authentication initialization state */
  isInitialized: boolean;
  /** Current authentication error */
  error: AuthError | null;
  /** Whether the user is in guest mode */
  isGuestMode: boolean;
}

export interface AuthContextValue extends AuthState {
  /** Sign in with email and password */
  signIn: (credentials: SignInCredentials) => Promise<void>;
  /** Sign up with email and password */
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  /** Sign out current user */
  signOut: () => Promise<void>;
  /** Enter guest mode */
  enterGuestMode: () => Promise<void>;
  /** Clear current error */
  clearError: () => void;
  /** Refresh current user */
  refreshUser: () => Promise<void>;
}

export type AuthAction =
  | { type: 'AUTH_INIT_START' }
  | { type: 'AUTH_INIT_SUCCESS'; payload: { user: User | null } }
  | { type: 'AUTH_INIT_ERROR'; payload: { error: AuthError } }
  | { type: 'AUTH_LOADING_START' }
  | { type: 'AUTH_LOADING_END' }
  | { type: 'AUTH_SIGN_IN_SUCCESS'; payload: { user: User } }
  | { type: 'AUTH_SIGN_UP_SUCCESS'; payload: { user: User } }
  | { type: 'AUTH_SIGN_OUT_SUCCESS' }
  | { type: 'AUTH_GUEST_MODE_ENTER' }
  | { type: 'AUTH_ERROR'; payload: { error: AuthError } }
  | { type: 'AUTH_ERROR_CLEAR' }
  | { type: 'AUTH_USER_UPDATE'; payload: { user: User } };

/**
 * Firebase Auth error codes that we handle specifically
 */
export const AUTH_ERROR_CODES = {
  USER_NOT_FOUND: 'auth/user-not-found',
  WRONG_PASSWORD: 'auth/wrong-password',
  EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  INVALID_EMAIL: 'auth/invalid-email',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];