/* eslint-disable dot-notation */
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Communities } from '/imports/api/communities/communities.js';
import { CompanySchema } from './company.js';

var subtype = 'company'; // eslint-disable no-var

Communities.schema = new SimpleSchema([Communities.schema, { profile: { type: CompanySchema, optional: true } }]);
Communities.attachSchema(Communities.schema);

Communities.publicFields['profile'] = 1;
