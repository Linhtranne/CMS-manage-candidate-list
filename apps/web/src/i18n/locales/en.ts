import type { DeepMessageShape } from '../types';
import type { vi } from './vi';

export const en = {
  common: {
    brand: {
      name: 'Candidate Supply',
      cmsName: 'Candidate Supply CMS'
    },
    metadata: {
      description: 'Internal CMS for recruitment and workforce supply to Japan'
    },
    a11y: {
      skipToContent: 'Skip to main content'
    },
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      retry: 'Retry',
      addCandidate: 'Add candidate',
      logout: 'Log out'
    },
    greeting: 'Hello, {name}',
    files: {
      one: '{count} file',
      other: '{count} files'
    },
    fallbackOnly: 'Fallback content',
    states: {
      loading: 'Loading data',
      noResults: 'No matching results'
    },
    language: {
      label: 'Language'
    },
    user: {
      internalStaff: 'Internal staff'
    },
    search: {
      label: 'Search across the CMS',
      placeholder: 'Search candidates, clients, and job orders',
      results: 'Search results',
      loading: 'Searching',
      empty: 'No results found'
    },
    notifications: {
      title: 'Notifications',
      hasNew: 'New notifications available',
      list: 'Notification list',
      markRead: 'Mark as read',
      tones: {
        danger: 'Needs attention',
        warning: 'Due soon',
        info: 'New'
      },
      items: {
        scheduleTitle: 'Candidate schedule needs confirmation',
        scheduleDetail: '{name} · in 15 minutes',
        emailTitle: 'New unlinked email',
        emailDetail: '1 message in the shared mailbox · today',
        journeyTitle: 'Supply journey milestone is nearly overdue',
        journeyDetail: '{name} · tomorrow'
      }
    }
  },
  auth: {
    login: {
      title: 'Sign in to CMS',
      staffOnly: 'For internal staff only.',
      email: 'Work email',
      password: 'Password',
      submitting: 'Signing in…',
      submit: 'Sign in',
      connectionError: 'Unable to connect to the system. Please try again.'
    },
    sessionExpired: {
      title: 'Your session has expired',
      description: 'Sign in again to continue managing candidates.',
      loginAgain: 'Sign in again'
    },
    forbidden: {
      title: 'You do not have access',
      description: 'Contact a system administrator if you need additional access.',
      backToWork: 'Back to my work'
    },
    checkingSession: 'Checking your session',
    sessionUnavailable: 'Your session is unavailable. Sign in again or retry.'
  },
  navigation: {
    ariaLabel: 'CMS navigation',
    internalCms: 'Internal CMS',
    openMobile: 'Open navigation',
    work: 'My work',
    clients: 'Clients',
    orders: 'Job orders',
    candidates: 'Candidates',
    applications: 'Applications & Interviews',
    journeys: 'Supply journeys',
    mailbox: 'Shared mailbox',
    reports: 'Reports',
    admin: 'Administration'
  },
  validation: {},
  work: {},
  clients: {},
  orders: {},
  candidates: {},
  applications: {},
  journeys: {},
  mailbox: {},
  reports: {},
  admin: {}
} as const satisfies DeepMessageShape<typeof vi>;
