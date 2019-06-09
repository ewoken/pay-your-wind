const { groupBy, mapValues, values, sortBy, merge } = require('lodash');

function mergeData(dataArrays) {
  const allData = [].concat(...dataArrays);
  const groupedByDate = groupBy(allData, d => d.startDate);
  const mergedByDate = mapValues(groupedByDate, group => merge({}, ...group));
  const res = values(mergedByDate);

  return sortBy(res, d => d.startDate);
}

module.exports = {
  mergeData
};
