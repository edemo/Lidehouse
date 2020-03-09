import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Memberships } from './memberships';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

function transformSchemaForUI(schema) {
  const transformedSchema = new SimpleSchema(schema);
  transformedSchema._schema.partnerId.optional = false;
  Meteor.startup(() => {
    transformedSchema.i18n('schemaMemberships');
    transformedSchema.i18n('schemaActivePeriod');
  });
  return transformedSchema;
}

Memberships.entities = {
  roleship: {
    name: 'roleship',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'manager' })),
    inputFields: ['role', 'rank', 'partnerId'],
    modifiableFields: ['role', 'rank', 'partnerId'],
    implicitFields: {
      communityId: getActiveCommunityId,
      approved: true,
    },
  },
  ownership: {
    name: 'ownership',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'owner' })),
    inputFields: ['partnerId', 'ownership'],
    modifiableFields: ['partnerId', 'ownership'],
    implicitFields: {
      communityId: getActiveCommunityId,
      parcelId: () => Session.get('modalContext').parcelId,
      role: 'owner',
      approved: true,
    },
  },
  benefactorship: {
    name: 'benefactorship',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'benefactor' })),
    inputFields: ['partnerId', 'benefactorship'],
    modifiableFields: ['partnerId', 'benefactorship'],
    implicitFields: {
      communityId: getActiveCommunityId,
      parcelId: () => Session.get('modalContext').parcelId,
      role: 'benefactor',
      approved: true,
    },
  },
  delegate: {
    name: 'delegate',
    schema: transformSchemaForUI(Memberships.simpleSchema({ role: 'delegate' })),
    inputFields: ['partnerId'],
    implicitFields: {
      communityId: getActiveCommunityId,
      role: 'delegate',
      approved: true,
    },
  },
};
