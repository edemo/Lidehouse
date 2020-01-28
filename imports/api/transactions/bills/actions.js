import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/components/bill-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Bills } from './bills.js';
import { Payments } from '../payments/payments.js';
import { Txdefs } from '../txdefs/txdefs.js';
import { Transactions } from '../transactions.js';
import '../methods.js';


//------------------------------------------
