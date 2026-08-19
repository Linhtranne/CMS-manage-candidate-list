import type { DeepMessageShape } from '../types';
import type { vi } from './vi';

export const en = {
  common: {
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      retry: 'Retry',
      addCandidate: 'Add candidate'
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
    }
  },
  auth: {},
  navigation: {
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
