import { newBundledErrors } from '/imports/utils/errors.js';
import { Log } from '/imports/utils/log.js';

export function digestImportJsons(jsons, phase) {
  let docs = jsons;
  const collection = phase.collection();
  Log.info(`Importing into ${collection._name}`);
//      if (options && options.multipleDocsPerLine) docs = singlify(docs);
  const translator = phase.translator();
  if (translator) {
    Log.info(`Translating ${docs.length} docs`);
    docs = translator.reverse(docs);
    Log.info(`Applying defaults to ${docs.length} docs`);
    translator.applyDefaults(docs);
  }

  const parser = phase.parser();
  Log.info(`Parsing ${docs.length} docs`);
  const parsingErrors = [];
  docs.forEach(doc => {
    try { parser.parse(doc); } catch (err) { parsingErrors.push(err); }
  });
  if (parsingErrors.length) throw newBundledErrors(parsingErrors);

  Log.info(`Transforming ${docs.length} docs`);
  const transformer = phase.transformer();
  const tdocs = transformer(docs); // transformation may even change the set of docs
  Log.info(`Validating ${tdocs.length} docs`);
  tdocs.forEach(doc => {
    collection.simpleSchema(doc).clean(doc);
    collection.simpleSchema(doc).validate(doc);
    // TODO: where should the removal of calculated  values happen?
  });
  return { docs, tdocs }; // docs are translated, parsed -- tdocs are transformed and validated as well
}
