// The different community types bring in their own i18n extensions
import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { comtype } from '/imports/comtypes/comtype.js';

TAPi18n.loadTranslations(comtype().translation, 'project');

// Note: Currently this is run on the CLIENT ONLY
// So comtype transaltions will not be available on the server.
