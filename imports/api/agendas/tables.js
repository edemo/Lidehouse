import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
// import { Agendas } from '/imports/api/agendas/agendas.js';

export function agendaColumns() {
  return [
    { data: 'title', title: __('schemaAgendas.title.label') },
    { data: 'topics()', title: __('schemaAgendas.topicIds.label'), render: cellData => _.pluck(cellData, 'title') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { options: { id: cellData }, collection: 'agendas', actions: 'edit,delete', size: 'sm' }),
    },
  ];
}
