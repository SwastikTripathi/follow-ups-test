
'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface OnboardingTutorialContextType {
  startTutorial: boolean;
  setStartTutorial: (start: boolean) => void;
}

const OnboardingTutorialContext = createContext<OnboardingTutorialContextType | undefined>(undefined);

export const OnboardingTutorialProvider = ({ children }: { children: ReactNode }) => {
  const [startTutorial, setStartTutorial] = useState(false);

  return (
    <OnboardingTutorialContext.Provider value={{ startTutorial, setStartTutorial }}>
      {children}
    </OnboardingTutorialContext.Provider>
  );
};

export const useOnboardingTutorial = (): OnboardingTutorialContextType => {
  const context = useContext(OnboardingTutorialContext);
  if (context === undefined) {
    throw new Error('useOnboardingTutorial must be used within an OnboardingTutorialProvider');
  }
  return context;
};
