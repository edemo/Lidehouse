import { newBundledErrors } from '/imports/utils/errors.js';

export function digestImportJsons(jsons, phase) {
  let docs = jsons;
  const collection = phase.collection();
  console.log(`Importing into ${collection._name}`);
//      if (options && options.multipleDocsPerLine) docs = singlify(docs);
  const translator = phase.translator();
  if (translator) {
    console.log(`Tranlsating ${docs.length} docs`);
    docs = translator.reverse(docs);
    console.log(`Applying defaults to ${docs.length} docs`);
    translator.applyDefaults(docs);
  }

  const parser = phase.parser();
  console.log(`Parsing ${docs.length} docs`);
  const parsingErrors = [];
  docs.forEach(doc => {
    try { parser.parse(doc); } catch (err) { parsingErrors.push(err); }
  });
  if (parsingErrors.length) throw newBundledErrors(parsingErrors);

  console.log(`Transforming ${docs.length} docs`);
  const transformer = phase.transformer();
  const tdocs = transformer(docs); // transformation may even change the set of docs
  console.log(`Validating ${tdocs.length} docs`);
  tdocs.forEach(doc => {
    collection.simpleSchema(doc).clean(doc);
    collection.simpleSchema(doc).validate(doc);
    delete doc.outstanding; // TODO: where should the removal of such default values happen?
  });
  return { docs, tdocs }; // docs are translated, parsed -- tdocs are transformed and validated as well
}
