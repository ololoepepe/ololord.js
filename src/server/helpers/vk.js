import _ from 'underscore';
import HTTP from 'q-io/http';

import config from './config';
import * as Tools from './tools';


const VK_API_CALL_TIMEOUT = Tools.MINUTE;

export default async function(method, params) {
  if (!method) {
    throw new Error(Tools.translate('Invalid VK API method'));
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
    timeout: VK_API_CALL_TIMEOUT
  });
  if (200 !== response.status) {
    throw new Error(Tools.translate('Failed to call VK API method'));
  }
  let data = await response.body.read();
  return JSON.parse(data.toString());
}
