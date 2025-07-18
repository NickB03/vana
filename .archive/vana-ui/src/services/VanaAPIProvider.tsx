import React, { createContext, useContext } from 'react';
import { vanaAPI } from './api';

interface VanaAPIContextType {
  api: {
    sendMessage: (message: string, sessionId?: string) => Promise<string>;
    streamMessage: (message: string, callbacks: any, sessionId?: string) => Promise<void>;
  };
}

const VanaAPIContext = createContext<VanaAPIContextType | undefined>(undefined);

export const useVanaAPI = (): VanaAPIContextType => {
  const context = useContext(VanaAPIContext);
  if (!context) {
    throw new Error('useVanaAPI must be used within a VanaAPIProvider');
  }
  return context;
};

type Props = { children: React.ReactNode; };
export const VanaAPIProvider = ({ children }: Props): JSX.Element => {
  return (
    <VanaAPIContext.Provider value={{ 
      api: vanaAPI
    }}>
      {children}
    </VanaAPIContext.Provider>
  );
};
