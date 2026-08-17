import { setupWorker } from 'msw/browser';
import { systemHandlers } from './handlers/system';
import { searchAuthHandlers } from './handlers/search-auth';
import { savedViewHandlers } from './handlers/saved-views';
import { workHandlers } from './handlers/work';
import { clientsOrdersHandlers } from './handlers/clients-orders';
import { applicationsHandlers } from './handlers/applications';
import { journeysHandlers } from './handlers/journeys';
import { mailHandlers } from './handlers/mail';
import { reportsAdminHandlers } from './handlers/reports-admin';
import { candidatesHandlers } from './handlers/candidates';

export const worker = setupWorker(...systemHandlers, ...searchAuthHandlers, ...savedViewHandlers, ...workHandlers, ...clientsOrdersHandlers, ...candidatesHandlers, ...applicationsHandlers, ...journeysHandlers, ...mailHandlers, ...reportsAdminHandlers);
