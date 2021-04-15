import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { CollectionHooks } from 'meteor/matb33:collection-hooks';
import { PerformanceLogger } from '/imports/utils/performance-logger.js';

ValidatedMethod.prototype._mdgExecute = ValidatedMethod.prototype._execute;

ValidatedMethod.prototype._execute = function _execute(...args) {
  CollectionHooks.defaultUserId = args[0].userId;
  const result = PerformanceLogger.call(this.name, this._mdgExecute, this, ...args);
  CollectionHooks.defaultUserId = undefined;
  return result;
};
