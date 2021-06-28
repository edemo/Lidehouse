// This defines a starting set of data to be loaded if the app is loaded with an empty db.
import './migrations.js';
import './initialization.js';
import './live-fixtures.js';

// This file configures the Accounts package to define the UI of the enrollment / verification / reset password email.
import './accounts-email-config.js';
import './accounts-verification.js';

import '../../email/notifications-send.js';
import './email-sender.js';

import './validated-method.js';

// Set up some rate limiting and other important security settings.
import './security.js';
import './browser-policy.js';

// This contains registered jobs to be executed in the future
import './jobs-timers.js';

// This defines all the collections, publications and methods that the application provides
// as an API to the client.
import './register-api.js';

import './push-config.js';
import './kadira.js';
