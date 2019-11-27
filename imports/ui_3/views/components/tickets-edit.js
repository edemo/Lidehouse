
export function afTicketInsertModal(type, contractId) {

  let fields = topic.modifiableFields().concat(topic.startFields());
  if (type === 'maintenance') {
    fields.push('moreDates');
  }
  if (contractId) {
    fields = _.without(fields, 'ticket.contractId', 'ticket.partnerId');
  }

  Session.set('activeTicketType', type);
  Session.set('activeContractId', contractId);
  Modal.show('Autoform_edit', {
    id: 'af.ticket.insert',
    schema: schemaWithMoreDates,
    fields,
  });
}

//-------------------------------------------------------------