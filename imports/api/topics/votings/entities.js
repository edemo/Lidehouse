import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/entities.js';
import { Votings } from './votings';

// const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };
