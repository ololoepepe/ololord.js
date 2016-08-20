function selectParser(parse) {
  if (typeof parse === 'function') {
    return (data) => {
      if (typeof data === 'null' || typeof data === 'undefined') {
        return data;
      }
      return parse(data);
    };
  } else if (parse || typeof parse === 'undefined') {
    return (data) => {
      if (typeof data !== 'string') {
        return data;
      }
      return JSON.parse(data);
    };
  } else {
    return data => data;
  }
}

function selectStringifier(stringify) {
  if (typeof stringify === 'function') {
    return (data) => {
      if (typeof data === 'null' || typeof data === 'undefined') {
        return data;
      }
      return stringify(data);
    };
  } else if (stringify || typeof stringify === 'undefined') {
    return JSON.stringify.bind(null);
  } else {
    return data => data;
  }
}

export default class CommonKey {
  constructor(client, key, { parse, stringify } = {}) {
    this.client = client;
    this.key = key;
    this.parse = selectParser(parse);
    this.stringify = selectStringifier(stringify);
  }

  fullKey(subkey, separator) {
    return this.key + (subkey ? `${separator || ':'}${subkey}` : '');
  }

  async exists(subkey) {
    let exists = await this.client.exists(this.fullKey(subkey));
    return !!exists;
  }

  async find(query, subkey) {
    query = (typeof query !== 'undefined') ? `:${query}` : ':*';
    return await this.client.keys(this.fullKey(subkey) + query);
  }

  async delete(subkey) {
    return await this.client.del(this.fullKey(subkey));
  }
}
