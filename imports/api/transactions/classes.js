import { _ } from 'meteor/underscore';

class Transaction {
  constructor(dataType, data) {
    this.dataType = dataType;
    this.data = data;
  }
}

class CustomerBill extends Transaction {
  constructor(data) {
    super('bills', _.extend(data, { relation: 'customer' }));
  }
}

class SupplierBill extends Transaction {
  constructor(data) {
    super('bills', _.extend(data, { relation: 'supplier' }));
  }
}

class ParcelBill extends Transaction {
  constructor(data) {
    super('bills', _.extend(data, { relation: 'member' }));
  }
}

class CustomerPayment extends Transaction {
  constructor(data) {
    super('payments', _.extend(data, { relation: 'customer' }));
  }
}

class SupplierPayment extends Transaction {
  constructor(data) {
    super('payments', _.extend(data, { relation: 'supplier' }));
  }
}

class ParcelPayment extends Transaction {
  constructor(data) {
    super('payments', _.extend(data, { relation: 'member' }));
  }
}

class MoneyTransfer extends Transaction {
  constructor(data) {
    super('', data);
  }
}

class AccountingOp extends Transaction {
  constructor(data) {
    super('', data);
  }
}
