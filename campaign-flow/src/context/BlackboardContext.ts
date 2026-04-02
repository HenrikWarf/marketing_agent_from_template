import { createContext } from 'react';
import { BlackboardState } from '../types/blackboard';

export interface BlackboardContextType {
  state: BlackboardState;
  updateState: (newState: Partial<BlackboardState>) => void;
  resetState: () => void;
}

export const BlackboardContext = createContext<BlackboardContextType | undefined>(undefined);
