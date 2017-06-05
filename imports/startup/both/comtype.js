import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { comtype } from '/imports/comtypes/comtype.js';

Meteor.startup(function setCommunityType() {
  TAPi18n.loadTranslations(comtype.translation, 'project');
});
