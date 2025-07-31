
'use client';

import { type Step } from 'react-shepherd';

const createStepText = (title: string, mainText: string) => {
    return `<h3 class="font-headline text-lg font-semibold text-foreground">${title}</h3><p class="text-sm text-muted-foreground">${mainText}</p>`;
};

export const steps: Step[] = [
  {
    id: 'intro',
    text: createStepText("Welcome to FollowUps! 👋", "Tired of being Ghosted? 👻 Let's take care of that."),
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
    text: createStepText("Your Command Center 🧑‍✈️", "This is your Mission Control! This is where you'll see your most important stats at a glance, like reminders and recent activity. No more guessing what's next!"),
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
    text: createStepText('Your Trusty Toolkit 🧭', 'This is your navigation panel. Jump between your Dashboard, Leads, Contacts, and Companies from here. Easy peasy.'),
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
    text: createStepText('Your Power Meter ⚡️', "Keep an eye on your usage stats here. When you're ready to level up, you can upgrade your plan right from the settings menu."),
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
    text: createStepText('Adding a New Lead ✨', "This is where the magic begins! Click here to add a new job application, sales lead, or any other opportunity you want to track."),
  },
  {
    id: 'summary-step',
    text: createStepText("You're All Set! ✅", "You're ready to rock! From here you can:<ul><li class='mt-2'>✅ Track all your job applications and sales leads.</li><li class='mt-1'>📇 Manage your contacts and companies.</li><li class='mt-1'>🌐 Build and host a public resume page from settings.</li></ul>"),
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
    canClickTarget: false, 
    buttons: [
       {
        classes: 'shepherd-button-secondary',
        text: 'Back',
        type: 'back',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Finish',
        type: 'next', 
      },
    ],
    text: createStepText('Manage Your Leads 🚀', 'All your leads will live on the Leads page. Click "Finish" to complete the tour and start crushing your goals!'),
  },
];
