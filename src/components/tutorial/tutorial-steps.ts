
import type { Step } from 'react-shepherd';

// Shepherd.js attachTo.on supports these specific placements.
// Using a specific type union instead of a generic string prevents future errors.
type PopperPlacement =
  | 'auto'
  | 'auto-start'
  | 'auto-end'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'left'
  | 'left-start'
  | 'left-end';

// Define the shape of a button object
interface StepButton {
    classes?: string;
    text: string;
    type?: 'back' | 'cancel' | 'next';
}

// Extend the base Step type to include all properties we're using.
interface StepWithTypedAttachment extends Step {
  id: string;
  attachTo?: {
    element: string;
    on: PopperPlacement;
  };
  buttons?: StepButton[];
  canClickTarget?: boolean;
  title?: string;
  text?: string | ((element: HTMLElement) => string) | HTMLElement;
}


export const steps: StepWithTypedAttachment[] = [
  {
    id: 'intro',
    attachTo: { element: '#dashboard-main-content-area', on: 'top' },
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Exit',
        type: 'cancel',
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Next',
        type: 'next',
      },
    ],
    title: 'Welcome to FollowUps!',
    text: "Let's take a quick tour of the main features to get you started.",
  },
  {
    id: 'add-lead',
    attachTo: { element: '#add-new-lead-button', on: 'bottom' },
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
    text: 'This is where the magic begins. Click here to add a new job application, sales lead, or any other prospect you want to track.',
  },
  {
    id: 'search-leads',
    attachTo: { element: '#leads-search-input', on: 'bottom' },
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
    title: 'Finding Your Leads',
    text: 'Once you have a few leads, you can easily find them using the search bar.',
  },
    {
    id: 'main-navigation',
    attachTo: { element: '#sidebar-main-nav-group', on: 'right' },
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
    title: 'Main Navigation',
    text: 'Use the sidebar to navigate between your Dashboard, Leads, Contacts, and Companies.',
  },
  {
    id: 'settings',
    attachTo: { element: '#sidebar-nav-settings-profile', on: 'right' },
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
    title: 'Customize Your Experience',
    text: 'Head over to Settings to customize your follow-up cadence, create default email templates, and manage your account.',
  },
];
