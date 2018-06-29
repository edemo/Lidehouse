import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { remove as removeAgenda } from '/imports/api/agendas/methods.js';

import '../components/voting-list.html';
import './agendas.html';

Template.Agendas.helpers({
    agendas() {
        const communityId = Session.get('activeCommunityId');
        return Agendas.find({ communityId }, { sort: { createdAt: -1 } });
    },
});

Template.Agendas.events({
    'click .js-new'(event) {
        Modal.show('Autoform_edit', {
            id: 'af.agenda.insert',
            collection: Agendas,
            omitFields: ['communityId'],
            type: 'method',
            meteormethod: 'agendas.insert',
            template: 'bootstrap3-inline',
        });
    },
    'click .js-edit'(event) {
        const id = $(event.target).data('id');
        Modal.show('Autoform_edit', {
            id: 'af.agenda.update',
            collection: Agendas,
            omitFields: ['communityId'],
            doc: Agendas.findOne(id),
            type: 'method-update',
            meteormethod: 'agendas.update',
            singleMethodArgument: true,
            template: 'bootstrap3-inline',
        });
    },
    'click .js-delete'(event) {
        const id = $(event.target).data('id');
        Modal.confirmAndCall(removeAgenda, { _id: id }, {
            action: 'delete agenda',
            message: 'This will not delete topics',
        });
    },
});

AutoForm.addModalHooks('af.agenda.insert');
AutoForm.addModalHooks('af.agenda.update');
AutoForm.addHooks('af.agenda.insert', {
    formToDoc(doc) {
        doc.communityId = Session.get('activeCommunityId');
        return doc;
    },
});
