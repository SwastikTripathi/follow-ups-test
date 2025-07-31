
'use client';

import { Shepherd } from 'react-shepherd';
import { type Step } from 'react-shepherd';

const createStepText = (mainText: string) => {
    return mainText;
};

export const steps: Step[] = [
  {
    id: 'intro',
    title: 'Welcome to FollowUps!',
    text: createStepText("Tired of being Ghosted? 👻 Let's take care of that"),
    buttons: [
      {
        classes: 'shepherd-button-secondary shepherd-button-skip',
        text: 'Skip',
        type: 'cancel',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'next',
      },
    ],
  },
  {
    id: 'dashboard-overview',
    attachTo: { element: '#dashboard-main-content-area', on: 'bottom' },
    canClickTarget: false,
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'back',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'next',
      },
    ],
    title: 'Your Command Center',
    text: createStepText("This is your Mission Control! 🧑‍✈️ This is where you'll see your most important stats at a glance, like reminders and recent activity. No more guessing what's next!"),
  },
  {
    id: 'main-navigation',
    attachTo: { element: '#sidebar-main-nav-group', on: 'right' },
    canClickTarget: false,
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'back',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'next',
      },
    ],
    title: 'Your Trusty Toolkit',
    text: createStepText('This is your navigation panel. 🧭 Jump between your Dashboard, Leads, Contacts, and Companies from here. Easy peasy.'),
  },
  {
    id: 'usage-progress',
    attachTo: { element: '#sidebar-usage-progress', on: 'right' },
    canClickTarget: false,
    buttons: [
       {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'back',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'next',
      },
    ],
    title: 'Your Power Meter',
    text: createStepText('Keep an eye on your usage stats here. When you\'re ready to level up, you can upgrade your plan right from the settings menu. ⚡️'),
  },
  {
    id: 'add-lead-info',
    attachTo: { element: '#dashboard-add-new-lead-button', on: 'bottom' },
    canClickTarget: false,
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'back',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'next',
      },
    ],
    title: 'Adding a New Lead',
    text: createStepText("This is where the magic begins! ✨ Click here to add a new job application, sales lead, or any other opportunity you want to track."),
  },
  {
    id: 'summary-step',
    title: 'You\'re All Set!',
    text: createStepText("You're ready to rock! From here you can:<ul class='list-disc pl-5 mt-2 space-y-1'><li>Track all your job applications and sales leads. ✅</li><li>Manage your contacts and companies. 📇</li><li>Build and host a public resume page from settings. 🌐</li></ul>"),
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'back',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'next',
      },
    ],
  },
   {
    id: 'final-leads-step',
    attachTo: { element: '#sidebar-nav-leads', on: 'right' },
    canClickTarget: false, // Make it unclickable
    buttons: [
       {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'back',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Finish',
        type: 'next', // 'next' will complete the tour on the last step
      },
    ],
    title: 'Manage Your Leads',
    text: createStepText('All your leads will live on the Leads page. Click "Finish" to complete the tour and start crushing your goals! 🎉'),
  },
];
