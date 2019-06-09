const fs = require('fs');

const dotenv = require('dotenv');
dotenv.config();

const moment = require('moment-timezone');
const { flatten } = require('lodash');

const { DATE_FORMAT, fetchToken, getWindAndSolarProd } = require('../rteApi');
const { mergeData } = require('../helpers');

async function bootstrap() {
  const priceBootstrapData = JSON.parse(fs.readFileSync('./bootstrap/price.json'));

  const formattedPriceData = flatten(priceBootstrapData.map(data => {
    return data.values.map((d, i) => ({
      startDate: moment(data.date).tz('Europe/Paris').add(i, 'hours').format(DATE_FORMAT),
      endDate: moment(data.date).tz('Europe/Paris').add(i + 1, 'hours').format(DATE_FORMAT),
      price_euros_mwh: d,
    }));
  }));
  const dates = priceBootstrapData.map(d => d.date);

  const token = await fetchToken();
  const windAndSolarProd = await Promise.all(dates.map(date => getWindAndSolarProd(date, token)));
  const windData = flatten(windAndSolarProd.map(d => d.wind));
  const solarData = flatten(windAndSolarProd.map(d => d.solar));

  const finalData = mergeData([formattedPriceData, windData, solarData]);

  fs.writeFileSync('./2019.json', JSON.stringify(finalData, null, 2));
}

bootstrap()
