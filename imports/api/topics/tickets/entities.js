import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/entities.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

// const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };
