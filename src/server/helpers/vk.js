import _ from 'underscore';
import HTTP from 'q-io/http';

import config from '../helpers/tools';
import * as Tools from '../helpers/tools';

export default async function(method, params) {
  if (!method) {
    return Promise.reject(new Error(Tools.translate('Invalid VK API method')));
  }
  params = params || {};
  params.access_token = config('site.vkontakte.accessToken');
  params = _(params).map((value, key) => {
    if (!_(value).isArray()) {
      value = [value];
    }
    return value.map((v) => `${key}=${value}`).join('&');
  }).join('&');
  let response = await HTTP.request({
    url: `https://api.vk.com/method/${method}?${params}`,
    method: 'POST',
    timeout: Tools.Minute //TODO: magic number
  });
  if (200 !== response.status) {
    return Promise.reject(new Error(Tools.translate('Failed to call VK API method')));
  }
  let data = await response.body.read();
  try {
    return Promise.resolve(JSON.parse(data.toString()));
  } catch (err) {
    return Promise.reject(err);
  }
}
