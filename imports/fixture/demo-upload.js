import { Meteor } from 'meteor/meteor';
import { DDP } from 'meteor/ddp';
import fs from 'fs';
import { CollectionHooks } from 'meteor/matb33:collection-hooks';
import { ShareddocsStore as store } from '/imports/api/shareddocs/shareddocs-store.js';
import { Log } from '/imports/utils/log.js';

export function uploadFileSimulation(storeParams, path) {
  // Log.debug('upload file simulation', path, storeParams);
  // The object passed can potentially be empty, BUT if you do custom-checks in `transformWrite`
  //  be sure to pass it the information it needs there. It is important, that in `transformWrite`
  //  you link up from & to parameters, otherwise nothing will happen
  const fileId = store.create(storeParams);
  const readStream = fs.createReadStream(path);  // create the stream
  readStream.on('error', (err) => {
    Log.error('error in readStream', err);
  });
  // Save the file to the store
  store.write(readStream, fileId, Meteor.bindEnvironment((err, file) => {
    if (err) Log.error('error in Store.write', err, file);
    // else Log.info('successful', file);
  }));
}

export function runWithFakeUserId(userId, toRun) {
  const DDPCommon = Package['ddp-common'].DDPCommon;
  const invocation = new DDPCommon.MethodInvocation({
    isSimulation: false,
    userId,
    setUserId: () => {},
    unblock: () => {},
    connection: {},
    randomSeed: Math.random(),
  });

  CollectionHooks.defaultUserId = userId;
  DDP._CurrentInvocation.withValue(invocation, () => {
    toRun();
  });
  CollectionHooks.defaultUserId = undefined;
}
