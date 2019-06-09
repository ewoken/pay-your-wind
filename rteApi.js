const fetch = require('node-fetch');
const qs = require('qs');

const moment =  require('moment-timezone');
const { groupBy } = require('lodash');

const { RTE_API_KEY } = process.env;
const RTE_HOST = 'https://digital.iservices.rte-france.com';

const PRICE_RESSOURCE = 'wholesale_market/v1/epex_spot_power_exchanges';
const ACTUAL_PRODUCTION = 'actual_generation/v1/actual_generations_per_production_type';
const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

const WIND_ONSHORE = 'WIND_ONSHORE';
const SOLAR = 'SOLAR';

const NOW = moment().tz('Europe/Paris');
const YESTERDAY = moment().tz('Europe/Paris').subtract(1, 'day').startOf('day');
const TODAY = moment().tz('Europe/Paris').startOf('day');
const TOMORROW = moment().tz('Europe/Paris').add(1, 'day').startOf('day');

async function fetchToken() {
  const res = await fetch(`${RTE_HOST}/token/oauth/`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${RTE_API_KEY}`
    }
  })
  const data = await res.json();
  return data.access_token;
}

async function getRessource({ ressource, params = {}, token }) {
  const url = `${RTE_HOST}/open_api/${ressource}?${qs.stringify(params)}`;
  console.log(url);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  const data = await res.json();
  return data;
}

async function getPrices(token) {
  const priceData = await getRessource({ ressource: PRICE_RESSOURCE, token });
  const epexObject = priceData.epex_spot_power_exchanges[0];

  console.log(epexObject);
  // assert.strictEqual(epexObject.start_date, TODAY);
  // assert.strictEqual(epexObject.end_date, TOMORROW);

  const { values } = epexObject;
  assert.strictEqual(values.length, 24);

  const prices = values.map(v => ({
    startDate: v.start_date,
    endDate: v.end_date,
    price_euros_mwh: v.price,
  }));

  return prices;
}

async function getWindAndSolarProd(date, token) {
  const params = {
    start_date: moment(date).tz('Europe/Paris').format(DATE_FORMAT),
    end_date: moment(date).tz('Europe/Paris').add(1, 'day').format(DATE_FORMAT),
  };
  const data = await getRessource({ ressource: ACTUAL_PRODUCTION, params, token })
  const prodData = data.actual_generations_per_production_type;
  const windProd = prodData.find(d => d.production_type === WIND_ONSHORE);
  const solarProd = prodData.find(d => d.production_type === SOLAR);

  const formattedWind = windProd.values.map(v => ({
    startDate: v.start_date,
    endDate: v.end_date,
    wind_mwh: v.value,
  }));
  const formattedSolar = solarProd.values.map(v => ({
    startDate: v.start_date,
    endDate: v.end_date,
    solar_mwh: v.value,
  }));

  return {
    wind: formattedWind,
    solar: formattedSolar,
  };
}

module.exports = {
  fetchToken,
  getRessource,
  getPrices,
  getWindAndSolarProd,
  DATE_FORMAT
}
