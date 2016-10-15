import _ from 'underscore';

import config from '../helpers/config';
import * as Tools from '../helpers/tools';

const vorpal = require('vorpal')();

function setupMethods(command) {
  let prompt = command.prompt;

  command.prompt = async function(options) {
    return new Promise((resolve, reject) => {
      let simple = (typeof options === 'string');
      if (simple) {
        options = {
          message: options,
          name: 'input'
        };
      }
      prompt.call(command, options, (result) => {
        resolve(simple ? result.input : result);
      });
    });
  };

  command.requestPassword = async function() {
    let result = await command.prompt({
      type: 'password',
      name: 'password',
      message: Tools.translate('Enter password: ')
    });
    let password = result.password;
    if (!password) {
      throw new Error(Tools.translate('Invalid password'));
    }
    if (!Tools.mayBeHashpass(password)) {
      return;
    }
    result = await command.prompt({
      type: 'confirm',
      name: 'hashpass',
      default: true,
      message: Tools.translate("That is a hashpass, isn't it? ")
    });
    return {
      password: password,
      notHashpass: !result || !result.hashpass
    };
  };
}

vorpal.installHandler = function(command, handler, { description, alias, options } = {}) {
  command = vorpal.command(command, description || undefined).action(async function(args, callback) {
    try {
      setupMethods(this);
      let result = await handler.call(this, args);
      if (result) {
        console.log(result);
      }
      callback();
    } catch (err) {
      console.log(err.stack || err);
      callback();
    }
  }).cancel(() => {
    console.log(Tools.translate('Cancelled'));
  });
  if (alias) {
    if (_(alias).isArray()) {
      command.alias(...alias);
    } else {
      command.alias(alias);
    }
  }
  if (_(options).isArray()) {
    options.forEach((option) => {
      command.option(option.value, option.description || undefined);
    });
  }
};

vorpal.find('exit').remove();

export default function commands(basicOnly, prompt) {
  let plugins = Tools.loadPlugins([__dirname, `${__dirname}/custom`], (fileName, _1, _2, path) => {
    return ('index.js' !== fileName) || (path.split('/') === 'custom');
  }).filter(plugin => config(`system.commands.${plugin.command.split(/\s/)[0]}`, true));
  if (basicOnly) {
    plugins = plugins.filter(plugin => plugin.basic);
  }
  plugins.forEach((plugin) => {
    vorpal.installHandler(plugin.command, plugin.handler, plugin.options);
  });
  console.log(Tools.translate("Type 'help' for commands"));
  vorpal.delimiter(prompt || 'ololord.js>').show();
  return vorpal;
}
