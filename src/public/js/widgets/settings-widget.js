import KO from 'knockout';

import * as Widgets from './';
import MovableWidget from './movable-widget';
import OverlayProgressBar from './overlay-progress-bar';
import PopupMessage from './popup-message';
import * as AJAX from '../helpers/ajax';
import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Hiding from '../core/hiding';
import * as Hotkeys from '../core/hotkeys';

const SYNCHRONIZATION_MESSAGE_TIMEOUT = 10 * Constants.SECOND;
const SYNCHRONIZATION_MIN_WIDTH = 450;
const SYNCHRONIZATION_MIN_HEIGHT = 200;

async function exportSettings() {
  try {
    await Widgets.prompt({
      title: Tools.translate('Copy settings string and save it somewhere'),
      value: JSON.stringify(Settings.localData({
        includeSettings: true,
        includeCustom: true,
        includePassword: true
      })),
      type: 'textarea',
      readOnly: true
    });
  } catch (err) {
    DOM.handleError(err);
  }
}

async function importSettings() {
  try {
    let result = await Widgets.prompt({
      title: Tools.translate('Paste settings string here'),
      type: 'textarea'
    });
    if (!result.accepted) {
      return;
    }
    Settings.setLocalData(JSON.parse(result.value), {
      includeSettings: true,
      includeCustom: true,
      includePassword: true
    });
  } catch (err) {
    DOM.handleError(err);
  }
}

async function synchronizeSettings() {
  let div = Templating.template('widgets/synchronizationWidget');
  let password = KO.observable('');
  let passwordVisible = KO.observable(false);
  KO.applyBindings({
    password: password,
    passwordVisible: passwordVisible,
    synchronizeSettings: Storage.synchronizeSettings,
    synchronizeCSSAndJS: Storage.synchronizeCSSAndJS,
    synchronizePassword: Storage.synchronizePassword,
    togglePasswordVisibility: (_, e) => {
      passwordVisible(!passwordVisible());
    },
  }, div);
  try {
    let options = {
      id: 'synchronizationWidget',
      title: Tools.translate('Synchronize', 'synchronizationText'),
      buttons: ['cancel', 'ok']
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: SYNCHRONIZATION_MIN_WIDTH,
        height: SYNCHRONIZATION_MIN_HEIGHT
      };
    } else {
      options.maximized = true;
    }
    let accepted = await Widgets.showWidget(div, options).promise;
    if (!accepted) {
      return;
    }
    password = password() || Storage.hashpass();
    if (!password) {
      PopupMessage.showPopup(Tools.translate('No password specified, and not logged in'), { type: 'critical' });
      return;
    }
    let result = await AJAX.api('synchronization', { key: password }, { indicator: new OverlayProgressBar() });
    let syncOptions = {
      includeSettings: Storage.synchronizeSettings(),
      includeCustom: Storage.synchronizeCSSAndJS(),
      includePassword: Storage.synchronizePassword()
    };
    if (result) {
      Settings.setLocalData(result, syncOptions);
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/synchronize`, Tools.createFormData({
      key: password,
      data: JSON.stringify(Settings.localData(syncOptions))
    }));
    PopupMessage.showPopup(Tools.translate('Synchronization completed successfully'));
    PopupMessage.showPopup(Tools.translate('Synchronization data will be available within 5 minutes'), {
      timeout: SYNCHRONIZATION_MESSAGE_TIMEOUT,
      type: 'warning'
    });
  } catch (err) {
    DOM.handleError(err);
  }
}

export default class SettingsWidget extends MovableWidget {
  constructor(options) {
    let content = Templating.template('widgets/settingsWidget');
    let passwordVisible = KO.observable(false);
    KO.applyBindings({
      settings: Settings,
      password: Storage.password,
      activateTab: DOM.activateTab.bind(null, '#settings'),
      changeDeviceType: DOM.resetDeviceType,
      changeTime: DOM.processFormattedDate.bind(null, null, true),
      passwordVisible: passwordVisible,
      togglePasswordVisibility: (_, e) => {
        passwordVisible(!passwordVisible());
      },
      generateNewPassword: () => {
        Storage.password(Tools.generatePassword());
      },
      importSettings: importSettings,
      exportSettings: exportSettings,
      synchronizeSettings: synchronizeSettings,
      editSpells: Widgets.editCode.bind(null, '', { name: 'spells' }),
      showHiddenPostList: Hiding.showHiddenPostList,
      editUserCss: Widgets.editCode.bind(null, 'css', { name: 'userCSS' }),
      editUserJavaScript: Widgets.editCode.bind(null, 'javascript', { name: 'userJavaScript' }),
      editHotkeys: Hotkeys.editHotkeys
    }, content);
    super(content, options);
  }
}
