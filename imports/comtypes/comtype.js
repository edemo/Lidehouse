/* eslint-disable dot-notation */
import { Meteor } from 'meteor/meteor';

import { noType } from './notype/no-type.js';
import { condominiumType } from './condominium/condominium-type.js';
import { companyType } from './company/company-type.js';
//import { clubType } from './club/club-type.js';

export function comtype() {
  const type = Meteor.settings.communityType;
  switch (type) {
//    case 'club': return clubType;
    case 'company': return companyType;
    case 'condominium': return condominiumType;
    default: return condominiumType;
  }
}
