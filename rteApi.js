const fetch = require('node-fetch');
const qs = require('qs');

const moment =  require('moment-timezone');

const { mergeData } = require('./helpers');

const { RTE_API_KEY } = process.env;
const RTE_HOST = 'https://digital.iservices.rte-france.com';

const ACTUAL_PRODUCTION = 'actual_generation/v1/actual_generations_per_production_type';
const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

const WIND_ONSHORE = 'WIND_ONSHORE';
const SOLAR = 'SOLAR';

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
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  const data = await res.json();
  return data;
}

async function getWindAndSolarProd(startDate, endDate, token) {
  const params = {
    start_date: moment(startDate).tz('Europe/Paris').format(DATE_FORMAT),
    end_date: moment(endDate).tz('Europe/Paris').format(DATE_FORMAT),
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

  return mergeData([formattedSolar, formattedWind]);
}

module.exports = {
  fetchToken,
  getRessource,
  getWindAndSolarProd,
  DATE_FORMAT
}
