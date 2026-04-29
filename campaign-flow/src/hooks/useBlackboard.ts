import { useContext } from 'react';
import { BlackboardContext } from '../context/BlackboardContext';

export const useBlackboard = () => {
  const context = useContext(BlackboardContext);
  if (context === undefined) {
    throw new Error('useBlackboard must be used within a BlackboardProvider');
  }
  return context;
};
