import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { communityColumns } from '/imports/api/communities/tables.js';
import { Communities } from '/imports/api/communities/communities.js';
import { insert as insertMembership } from '../../api/memberships/methods.js';
import { communityProfilesFront } from '/imports/api/communities/tables.js';

import './communities-front.html';

Template.Communities_front_page.onCreated(function onCreated() {
  this.subscribe('communities.listing');
});

Template.Communities_front_page.onCreated(function communitiesShowPageOnCreated() {
  this.communityId = () => FlowRouter.getParam('_cid');

  this.autorun(() => {
    this.subscribe('communities.listing');
  });
});

Template.Communities_front_page.helpers({
  communities() {
    return Communities.find({});
  },
  reactiveTableDataFn() {
    function getTableData() {
      return Communities.find().fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: communityProfilesFront(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
  getTitle(){
	return document.title; // asd todo: csak a LiDeHouse-t akarom kiprintelni
  }

/*  community_s() {
    return Communities;
  },
  showCommunityContact(community) {
  	let result = "asd";
  	Object.keys(community).forEach(key=>{result+="<li>"+key+": "+community[key]+"</li>"});
    return result;
  }, */
});