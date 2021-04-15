import { _ } from 'meteor/underscore';
import { Log } from '/imports/utils/log.js';

export const PerformanceLogger = {
  aggregation: false,
};

PerformanceLogger.startAggregation = function startAggregation() {
  PerformanceLogger.aggregation = true;
  PerformanceLogger.aggregatedData = {};
};

PerformanceLogger.stopAggregation = function resetAggregation() {
  PerformanceLogger.logAggregation();
  PerformanceLogger.aggregation = false;
};

PerformanceLogger.logAggregation = function logAggregation() {
  Log.info('[Aggregated Avg Times]');
  _.each(PerformanceLogger.aggregatedData, (res, name) => {
    Log.info(name, res.time / res.count, 'ms', res.count, 'times');
  });
};

PerformanceLogger.call = function call(name, func, ...args) {
  Log.debug('Invoking', name);
  const start = Date.now();
  const result = func?.call(...args);
  const finish = Date.now();
  const elapsedTime = finish - start;
  Log.info('Method', name, elapsedTime, 'ms', args?.[1]?.userId);
  if (PerformanceLogger.aggregation) {
    PerformanceLogger.aggregatedData[name] = PerformanceLogger.aggregatedData[name] || { time: 0, count: 0 };
    PerformanceLogger.aggregatedData[name].time += elapsedTime;
    PerformanceLogger.aggregatedData[name].count += 1;
  }
  return result;
};
