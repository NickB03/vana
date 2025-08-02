/**
 * AuthContext - Authentication state management for Vana
 * 
 * Provides authentication state and actions using Firebase Auth with guest mode support.
 * Optimized to prevent unnecessary re-renders by splitting context values.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  AuthState,
  AuthContextValue,
  AuthAction,
  AuthError,
  SignInCredentials,
  SignUpCredentials,
  User,
  AUTH_ERROR_CODES,
} from '@/types/auth';

// Firebase imports (will be configured separately)
// import { auth } from '@/lib/firebase';
// import { 
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signOut as firebaseSignOut,
//   onAuthStateChanged,
//   User as FirebaseUser
// } from 'firebase/auth';

// Initial auth state
const initialAuthState: AuthState = {
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  isGuestMode: false,
};

// Auth reducer for state management
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_INIT_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'AUTH_INIT_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        user: action.payload.user,
        error: null,
      };

    case 'AUTH_INIT_ERROR':
      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        error: action.payload.error,
      };

    case 'AUTH_LOADING_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'AUTH_LOADING_END':
      return {
        ...state,
        isLoading: false,
      };

    case 'AUTH_SIGN_IN_SUCCESS':
    case 'AUTH_SIGN_UP_SUCCESS':
      return {
        ...state,
        isLoading: false,
        user: action.payload.user,
        error: null,
        isGuestMode: false,
      };

    case 'AUTH_SIGN_OUT_SUCCESS':
      return {
        ...state,
        isLoading: false,
        user: null,
        error: null,
        isGuestMode: false,
      };

    case 'AUTH_GUEST_MODE_ENTER':
      return {
        ...state,
        isLoading: false,
        user: createGuestUser(),
        error: null,
        isGuestMode: true,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };

    case 'AUTH_ERROR_CLEAR':
      return {
        ...state,
        error: null,
      };

    case 'AUTH_USER_UPDATE':
      return {
        ...state,
        user: action.payload.user,
      };

    default:
      return state;
  }
}

// Create guest user object
function createGuestUser(): User {
  const now = new Date().toISOString();
  return {
    id: `guest_${Date.now()}`,
    email: null,
    displayName: 'Guest User',
    photoURL: null,
    emailVerified: false,
    isGuest: true,
    createdAt: now,
    lastSignInAt: now,
  };
}

// Convert Firebase user to our User type
function convertFirebaseUser(firebaseUser: any): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    isGuest: false,
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
    lastSignInAt: firebaseUser.metadata.lastSignInTime || null,
  };
}

// Create auth error object
function createAuthError(error: any): AuthError {
  let code = 'auth/unknown-error';
  let message = 'An unknown error occurred';

  if (error?.code) {
    code = error.code;
    message = getErrorMessage(error.code);
  } else if (error?.message) {
    message = error.message;
  }

  return {
    code,
    message,
    details: error,
  };
}

// Get user-friendly error messages
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case AUTH_ERROR_CODES.USER_NOT_FOUND:
      return 'No account found with this email address.';
    case AUTH_ERROR_CODES.WRONG_PASSWORD:
      return 'Incorrect password. Please try again.';
    case AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE:
      return 'An account with this email already exists.';
    case AUTH_ERROR_CODES.WEAK_PASSWORD:
      return 'Password should be at least 6 characters long.';
    case AUTH_ERROR_CODES.INVALID_EMAIL:
      return 'Please enter a valid email address.';
    case AUTH_ERROR_CODES.TOO_MANY_REQUESTS:
      return 'Too many failed attempts. Please try again later.';
    case AUTH_ERROR_CODES.NETWORK_REQUEST_FAILED:
      return 'Network error. Please check your connection.';
    default:
      return 'An error occurred. Please try again.';
  }
}

// Create contexts (split for performance optimization)
const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<Omit<AuthContextValue, keyof AuthState> | null>(null);

/**
 * AuthProvider component
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Initialize Firebase auth listener
  useEffect(() => {
    dispatch({ type: 'AUTH_INIT_START' });

    // For now, simulate Firebase auth initialization
    // This will be replaced with actual Firebase integration
    const initializeAuth = async () => {
      try {
        // Simulate auth check delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check for existing session (localStorage simulation)
        const savedUser = localStorage.getItem('vana_user');
        const savedGuestMode = localStorage.getItem('vana_guest_mode');
        
        if (savedGuestMode === 'true') {
          dispatch({ type: 'AUTH_GUEST_MODE_ENTER' });
        } else if (savedUser) {
          const user = JSON.parse(savedUser);
          dispatch({ type: 'AUTH_INIT_SUCCESS', payload: { user } });
        } else {
          dispatch({ type: 'AUTH_INIT_SUCCESS', payload: { user: null } });
        }
      } catch (error) {
        dispatch({
          type: 'AUTH_INIT_ERROR',
          payload: { error: createAuthError(error) },
        });
      }
    };

    initializeAuth();

    // TODO: Replace with Firebase auth state listener
    // const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    //   if (firebaseUser) {
    //     const user = convertFirebaseUser(firebaseUser);
    //     dispatch({ type: 'AUTH_INIT_SUCCESS', payload: { user } });
    //   } else {
    //     dispatch({ type: 'AUTH_INIT_SUCCESS', payload: { user: null } });
    //   }
    // });

    // return unsubscribe;
  }, []);

  // Authentication actions
  const signIn = useCallback(async (credentials: SignInCredentials) => {
    dispatch({ type: 'AUTH_LOADING_START' });

    try {
      // TODO: Replace with Firebase sign in
      // const result = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      // const user = convertFirebaseUser(result.user);
      
      // Simulate sign in for development
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user: User = {
        id: `user_${Date.now()}`,
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
        photoURL: null,
        emailVerified: true,
        isGuest: false,
        createdAt: new Date().toISOString(),
        lastSignInAt: new Date().toISOString(),
      };

      localStorage.setItem('vana_user', JSON.stringify(user));
      localStorage.removeItem('vana_guest_mode');
      
      dispatch({ type: 'AUTH_SIGN_IN_SUCCESS', payload: { user } });
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: { error: createAuthError(error) },
      });
      throw error;
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    dispatch({ type: 'AUTH_LOADING_START' });

    try {
      // TODO: Replace with Firebase sign up
      // const result = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      // const user = convertFirebaseUser(result.user);
      
      // Simulate sign up for development
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user: User = {
        id: `user_${Date.now()}`,
        email: credentials.email,
        displayName: credentials.displayName || credentials.email.split('@')[0],
        photoURL: null,
        emailVerified: false,
        isGuest: false,
        createdAt: new Date().toISOString(),
        lastSignInAt: new Date().toISOString(),
      };

      localStorage.setItem('vana_user', JSON.stringify(user));
      localStorage.removeItem('vana_guest_mode');
      
      dispatch({ type: 'AUTH_SIGN_UP_SUCCESS', payload: { user } });
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: { error: createAuthError(error) },
      });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING_START' });

    try {
      // TODO: Replace with Firebase sign out
      // await firebaseSignOut(auth);
      
      localStorage.removeItem('vana_user');
      localStorage.removeItem('vana_guest_mode');
      
      dispatch({ type: 'AUTH_SIGN_OUT_SUCCESS' });
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: { error: createAuthError(error) },
      });
      throw error;
    }
  }, []);

  const enterGuestMode = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING_START' });

    try {
      localStorage.setItem('vana_guest_mode', 'true');
      localStorage.removeItem('vana_user');
      
      dispatch({ type: 'AUTH_GUEST_MODE_ENTER' });
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: { error: createAuthError(error) },
      });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_ERROR_CLEAR' });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.user || state.isGuestMode) return;

    try {
      // TODO: Refresh user data from Firebase
      // const currentUser = auth.currentUser;
      // if (currentUser) {
      //   await currentUser.reload();
      //   const user = convertFirebaseUser(currentUser);
      //   dispatch({ type: 'AUTH_USER_UPDATE', payload: { user } });
      // }
    } catch (error) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: { error: createAuthError(error) },
      });
    }
  }, [state.user, state.isGuestMode]);

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      signIn,
      signUp,
      signOut,
      enterGuestMode,
      clearError,
      refreshUser,
    }),
    [signIn, signUp, signOut, enterGuestMode, clearError, refreshUser]
  );

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

/**
 * Hook to access auth state
 */
export function useAuthState(): AuthState {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to access auth actions
 */
export function useAuthActions(): Omit<AuthContextValue, keyof AuthState> {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to access both auth state and actions
 */
export function useAuth(): AuthContextValue {
  const state = useAuthState();
  const actions = useAuthActions();
  
  return {
    ...state,
    ...actions,
  };
}