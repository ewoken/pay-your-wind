const fetch = require('node-fetch');
const qs = require('qs');

const moment =  require('moment-timezone');
const { chunk } = require('lodash');

const { mergeData } = require('./helpers');

const { RTE_API_KEY } = process.env;
const RTE_HOST = 'https://digital.iservices.rte-france.com';

const ACTUAL_PRODUCTION = 'actual_generation/v1/actual_generations_per_production_type';
const GENERATION_MIX = 'actual_generation/v1/generation_mix_15min_time_scale';

const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

const WIND = 'WIND';
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

  if (!res.ok) {
    const t = await res.text();
    console.error(t);
    throw new Error('RTE Error');
  }

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

async function getWindAndSolarProd2(startDate, endDate, token) {
  const params = {
    start_date: moment(startDate).tz('Europe/Paris').format(DATE_FORMAT),
    end_date: moment(endDate).tz('Europe/Paris').format(DATE_FORMAT),
  };
  const data = await getRessource({ ressource: GENERATION_MIX, params, token });

  const prodData = data.generation_mix_15min_time_scale;
  const windProd = prodData.find(d => d.production_type === WIND);
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

  const merged = mergeData([formattedSolar, formattedWind])
  const res = chunk(merged, 4)
    .map(items => {
      const wind_mwh = items.reduce((s, o) => s + o.wind_mwh, 0) / 4;
      const solar_mwh = items.reduce((s, o) => s + o.solar_mwh, 0) / 4;

      return {
        startDate: items[0].startDate,
        endDate:
          moment(items[0].startDate).tz('Europe/Paris').add(1, 'hour').format(),
        wind_mwh,
        solar_mwh,
      };
    });

  return res;
}

module.exports = {
  fetchToken,
  getRessource,
  getWindAndSolarProd,
  getWindAndSolarProd2,
  DATE_FORMAT
}
