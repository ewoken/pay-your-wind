const { groupBy, mapValues, values, sortBy, merge, chunk } = require('lodash');

function mergeData(dataArrays) {
  const allData = [].concat(...dataArrays);
  const groupedByDate = groupBy(allData, d => d.startDate);
  const mergedByDate = mapValues(groupedByDate, group => merge({}, ...group));
  const res = values(mergedByDate);

  return sortBy(res, d => d.startDate);
}

function chunkAndChainPromises(data, dataToPromiseFn, chunkSize) {
  return chunk(data, chunkSize).reduce((last, items) => {
    return last.then(array => {
      return Promise.all(items.map(dataToPromiseFn)).then(values => {
        return array.concat(values);
      })
    })
  }, Promise.resolve([]))
}

function toCSV(array, keys) {
  const headers = keys.join(',');
  const lines = array.map(value => {
    return keys.map(key => value[key]).join(',');
  });
  const content = [headers, ...lines, '\n'];
  return content.join('\n');
}

module.exports = {
  mergeData,
  chunkAndChainPromises,
  toCSV
};
