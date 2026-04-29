import React, { useState, ReactNode } from 'react';
import { BlackboardState } from '../types/blackboard';
import { BlackboardContext } from './BlackboardContext';

export const BlackboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BlackboardState>({
    recommendations_data: null,
    brief_data: null,
    analysis_data: null,
    segments_data: null,
    content_data: null,
    review_data: null,
  });

  const updateState = (newState: Partial<BlackboardState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  const resetState = () => {
    setState({
      recommendations_data: null,
      brief_data: null,
      analysis_data: null,
      segments_data: null,
      content_data: null,
      review_data: null,
    });
  };

  return (
    <BlackboardContext.Provider value={{ state, updateState, resetState }}>
      {children}
    </BlackboardContext.Provider>
  );
};
