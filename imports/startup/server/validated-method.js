import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { CollectionHooks } from 'meteor/matb33:collection-hooks';
import { _ } from 'meteor/underscore';

ValidatedMethod.prototype._mdgExecute = ValidatedMethod.prototype._execute;

ValidatedMethod.prototype._execute = function (...args) {
  CollectionHooks.defaultUserId = args[0].userId;
  const start = Date.now();
  const result = this._mdgExecute(...args);
  const finish = Date.now();
  console.log('Method', this.name, finish - start, 'ms', args[0].userId);
  CollectionHooks.defaultUserId = undefined;
  return result;
};
