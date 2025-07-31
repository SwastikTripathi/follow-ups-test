
'use client';

import React, { useContext, useEffect } from 'react';
import { ShepherdTour, ShepherdTourContext } from 'react-shepherd';
import 'shepherd.js/dist/css/shepherd.css';
import { steps } from './tutorial-steps';
import { useOnboardingTutorial } from '@/contexts/OnboardingTutorialContext';

const tourOptions = {
  defaultStepOptions: {
    cancelIcon: {
      enabled: false,
    },
    classes: 'shadow-md bg-background',
    scrollTo: false,
  },
  useModalOverlay: true,
};

const TourController: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const tour = useContext(ShepherdTourContext);
  const { startTutorial, setStartTutorial } = useOnboardingTutorial();

  useEffect(() => {
    if (tour) {
      const onTourComplete = () => {
        console.log('[TUTORIAL] "complete" event fired. Calling onTutorialComplete prop.');
        onComplete();
      };

      const onTourCancel = () => {
        console.log('[TUTORIAL] "cancel" event fired. Calling onTutorialComplete prop.');
        onComplete();
      };

      tour.on('complete', onTourComplete);
      tour.on('cancel', onTourCancel);

      return () => {
        console.log('[TUTORIAL] Cleaning up tour listeners.');
        tour.off('complete', onTourComplete);
        tour.off('cancel', onTourCancel);
      };
    }
  }, [tour, onComplete]);


  useEffect(() => {
    if (startTutorial && tour) {
      console.log('[TUTORIAL] Start tutorial signal received. Starting tour.');
      tour.start();
      setStartTutorial(false);
    }
  }, [startTutorial, tour, setStartTutorial]);


  return null;
};

interface InteractiveTutorialProps {
    onTutorialComplete: () => void;
}

export function InteractiveTutorial({ onTutorialComplete }: InteractiveTutorialProps) {
  return (
    <ShepherdTour steps={steps as any} tourOptions={tourOptions}>
      <TourController onComplete={onTutorialComplete} />
    </ShepherdTour>
  );
}
