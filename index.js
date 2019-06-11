const fs = require('fs');

const dotenv = require('dotenv');
dotenv.config();
const moment = require('moment-timezone');
const { flatten, difference } = require('lodash');
const fetch = require ('node-fetch');

const { fetchToken, getWindAndSolarProd } = require('./rteApi');
const { mergeData, toCSV, chunkAndChainPromises } = require('./helpers');

const BUY_OBLIGATION_PRICES = require('./buyObligationPrices.json');
const years = Object.keys(BUY_OBLIGATION_PRICES).map(i => Number(i));

function chunkPeriod(startDate, endDate, days) {
  const totalDays = moment(endDate).diff(startDate, 'days');
  const chunkCount = Math.ceil(totalDays / days);

  return Array.from({ length: chunkCount - 1 })
    .map((_, i) => ({
      startDate: moment(startDate).tz('Europe/Paris').add(days * i, 'days').format(),
      endDate: moment(startDate).tz('Europe/Paris').add(days * (i + 1), 'days').format(),
    }))
    .concat([{
      startDate: startDate.tz('Europe/Paris').add(days * (chunkCount - 1), 'days').format(),
      endDate: endDate.format(),
    }])
}

async function getPrices(year) {
  const res = await fetch(`https://ewoken.github.io/epex-spot-data/data/${year}.json`);
  const data = await res.json();

  return data;
}

function csvFormatter(data) {
  const formattedData = data.map(item => {
    return {
      date: moment(item.startDate).tz('Europe/Paris').format('YYYY-MM-DD'),
      start_hour: moment(item.startDate).tz('Europe/Paris').format('HH:mm'),
      end_hour: moment(item.endDate).tz('Europe/Paris').format('HH:mm'),
      solar_mwh: item.solar_mwh,
      wind_mwh: item.wind_mwh,
      price_euros_mwh: item.price_euros_mwh,
      solarSubventions_euros: item.solarSubventions_euros,
      windSubventions_euros: item.windSubventions_euros,
    }
  });
  return toCSV(formattedData, Object.keys(formattedData[0]));
}

async function getYearData(year, token) {
  console.log(year);
  const startYear = moment({ year }).tz('Europe/Paris').startOf('year');
  const endYear = moment().tz('Europe/Paris').year() === year
    ? moment().startOf('day')
    : moment({ year: year + 1 }).tz('Europe/Paris').startOf('year');

  const windAndSolarProd = flatten(
    await Promise.all(
      chunkPeriod(startYear, endYear, 100)
        .map(({ startDate, endDate }) => getWindAndSolarProd(startDate, endDate, token))
    )
  );
  const priceData = await getPrices(year);
  const allData = mergeData([windAndSolarProd, priceData]);
  const dataWithSubventions = allData.map(data => {
    const { startDate, endDate, solar_mwh = 0, wind_mwh = 0, price_euros_mwh } = data;
    return {
      startDate,
      endDate,
      solar_mwh,
      wind_mwh,
      price_euros_mwh,
      solarSubventions_euros: solar_mwh * (BUY_OBLIGATION_PRICES[year].solar_euros_mwh - price_euros_mwh),
      windSubventions_euros: wind_mwh * (BUY_OBLIGATION_PRICES[year].wind_euros_mwh - price_euros_mwh),
    };
  });

  console.log(`Write ${year} files (${dataWithSubventions.length} items)`);
  fs.writeFileSync(`./data/${year}.json`, JSON.stringify(dataWithSubventions));
  fs.writeFileSync(`./data/${year}.csv`, csvFormatter(dataWithSubventions));
}

async function main() {
  const token = await fetchToken();
  const doneYears = fs.readdirSync('./data')
    .filter(filename => filename.endsWith('.json'))
    .map(filename => Number(filename.split('.')[0]))
    .filter(year => year !== moment().tz('Europe/Paris').year());
  const yearTodo = difference(years, doneYears);

  console.log(yearTodo);
  await chunkAndChainPromises(yearTodo, year => getYearData(year, token), 1);
}


main()
.catch(error => {
  console.log(error);
  process.exit(1);
})

