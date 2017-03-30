import _ from 'underscore';
import $ from 'jquery';

import * as Tools from './tools';

function createXHRFactory(indicator) {
  return () => {
    let xhr = new window.XMLHttpRequest();
    ['progress', 'loadend'].forEach((name) => {
      let handler = indicator[`on${name}`];
      if (typeof handler === 'function') {
        xhr.addEventListener(name, (e) => {
          handler.call(indicator, e);
        });
      }
    });
    ['progress', 'load'].forEach((name) => {
      let handler = indicator[`uploadOn${name}`];
      if (typeof handler === 'function') {
        xhr.upload.addEventListener(name, (e) => {
          handler.call(indicator, e);
        });
      }
    });
    if (typeof indicator.on === 'function') {
      indicator.on('abort', xhr.abort);
    }
    return xhr;
  };
}

export async function api(entity, parameters, { prefix, indicator } = {}) {
  prefix = prefix || 'api';
  let query = '';
  _(parameters).each(function(val, key) {
    if (!_(val).isArray()) {
      val = [val];
    }
    val.forEach(function(val) {
      if (query) {
        query += '&';
      }
      query += (key + '=' + val);
    });
  });
  query = (query ? '?' : '') + query;
  let params = {
    url: `/${Tools.sitePathPrefix()}${prefix}/${entity}.json${query}`,
    dataType: 'json',
    cache: false
  };
  if (typeof indicator === 'object') {
    params.xhr = createXHRFactory(indicator);
  }
  try {
    let result = await $.ajax(params);
    if (Tools.checkError(result)) {
      throw result;
    }
    return result;
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function post(action, formData, indicator) {
  let params = {
    type: 'POST',
    data: formData || new FormData(),
    processData: false,
    contentType: false
  };
  if (typeof indicator === 'object') {
    params.xhr = createXHRFactory(indicator);
  }
  try {
    let result = await $.ajax(action, params);
    if (Tools.checkError(result)) {
      return Promise.reject(result);
    }
    return result;
  } catch (err) {
    return Promise.reject(err);
  }
}
