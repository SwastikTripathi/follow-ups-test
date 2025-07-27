
'use client';

import React, { useContext, useEffect } from 'react';
import { ShepherdTour, ShepherdTourContext } from 'react-shepherd';
import 'shepherd.js/dist/css/shepherd.css';
import { steps } from './tutorial-steps';
import { useOnboardingTutorial } from '@/contexts/OnboardingTutorialContext';

const tourOptions = {
  defaultStepOptions: {
    cancelIcon: {
      enabled: true,
    },
    classes: 'shadow-md bg-background',
    scrollTo: { behavior: 'smooth', block: 'center' },
  },
  useModalOverlay: true,
};

const TourController: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const tour = useContext(ShepherdTourContext);
  const { startTutorial, setStartTutorial } = useOnboardingTutorial();

  useEffect(() => {
    if (startTutorial && tour) {
      tour.start();
      setStartTutorial(false); 
      
      const onTourComplete = () => onComplete();
      
      tour.on('complete', onTourComplete);
      tour.on('cancel', onTourComplete);
      
      return () => {
        tour.off('complete', onTourComplete);
        tour.off('cancel', onTourComplete);
      }
    }
  }, [startTutorial, tour, setStartTutorial, onComplete]);

  return null;
};

interface InteractiveTutorialProps {
    onTutorialComplete: () => void;
}

export function InteractiveTutorial({ onTutorialComplete }: InteractiveTutorialProps) {
  return (
    <ShepherdTour steps={steps} tourOptions={tourOptions}>
      <TourController onComplete={onTutorialComplete} />
    </ShepherdTour>
  );
}
