import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { CollectionHooks } from 'meteor/matb33:collection-hooks';

ValidatedMethod.prototype._mdgExecute = ValidatedMethod.prototype._execute;

ValidatedMethod.prototype._execute = function (...args) {
  CollectionHooks.defaultUserId = args[0].userId;
  const result = this._mdgExecute(...args);
  CollectionHooks.defaultUserId = undefined;
  return result;
};
