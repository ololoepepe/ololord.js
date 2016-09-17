import _ from 'underscore';
import $ from 'jquery';

import * as AJAX from '../helpers/ajax';
import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as WebSocket from '../core/websocket';
import * as Widgets from '../widgets';

const CHECK_INTERVAL_NORMAL = Constants.MINUTE;
const CHECK_INTERVAL_ACTIVE = 5 * Constants.SECOND;

let chatVisible = false;
let checkChatsTimer = null;
let lastChatCheckDate = Storage.lastChatCheckDate();

function notifyAboutNewMessage(keys) {
  if (!_(keys).isArray()) {
    keys = [keys];
  }
  let key = _(keys).last();
  let title = Tools.translate('Private chat', 'chatText');
  let txt = Tools.translate('New private messages');
  let div = $(`<div><span class='icon icon-bubble-16 button-icon' title='${title}'></span> ${txt} [${key}]</div>`);
  div.find('span').click(showChat.bind(null, key));
  Widgets.PopupMessage.showPopup(div[0], { type: 'node' });
  if (Settings.playAutoUpdateSound()) {
    DOM.playSound('message');
  }
}

function isDuplicate(message, messages) {
  return messages.some((msg) => {
    return (message.type === msg.type && message.date === msg.date && message.text === msg.text);
  });
}

function sortMessages(m1, m2) {
  return m1.date.localeCompare(m2.date);
}

export let checkChats = async function() {
  if (!Settings.useWebSockets() && checkChatsTimer) {
    clearTimeout(checkChatsTimer);
  }
  try {
    let model = await AJAX.api('chatMessages', { lastRequestDate: lastChatCheckDate || '' })
    lastChatCheckDate = model.lastRequestDate;
    Storage.lastChatCheckDate(lastChatCheckDate);
    let keys = [];
    let chats = Storage.chats();
    _(model.chats).each((messages, key) => {
      if (!chats.hasOwnProperty(key)) {
        chats[key] = [];
      }
      let list = chats[key];
      if (messages.length < 1) {
        return;
      }
      let any = false;
      messages.forEach((message) => {
        if (isDuplicate(message, list)) {
          return;
        }
        if ('in' === message.type) {
          message.unread = true;
        }
        list.push(message);
        any = true;
      });
      if (any) {
        keys.push(key);
        list.sort(sortMessages);
      }
    });
    if (keys.length > 0) {
      Storage.chats(Tools.cloned(chats));
      if (!chatVisible) {
        notifyAboutNewMessage(keys);
      }
    }
    if (!Settings.useWebSockets()) {
      checkChatsTimer = setTimeout(checkChats, chatVisible ? CHECK_INTERVAL_ACTIVE : CHECK_INTERVAL_NORMAL);
    }
  } catch (err) {
    DOM.handleError(err);
    if (!Settings.useWebSockets()) {
      checkChatsTimer = setTimeout(checkChats, CHECK_INTERVAL_NORMAL);
    }
  }
};

export async function showChat(key) {
  let options = {
    id: 'chatWidget',
    type: 'chatWidget',
    title: Tools.translate('Chat'),
    rememberGeometry: true,
    chat: { key: key }
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: 550,
      height: 400
    };
  } else {
    options.maximized = true;
  }
  chatVisible = true;
  await Widgets.showWidget(null, options).promise;
  chatVisible = false;
}

export async function deleteChat(key) {
  if (!key || typeof key !== 'string') {
    return;
  }
  let chats = Storage.chats();
  if (!chats.hasOwnProperty(key)) {
    return;
  }
  delete chats[key];
  Storage.chats(Tools.cloned(chats));
  let [boardName, postNumber, chatNumber] = key.split(':');
  let formData = Tools.createFormData({
    boardName: boardName,
    postNumber: +postNumber,
    chatNumber: +chatNumber
  });
  try {
    await AJAX.post(`/${Tools.sitePathPrefix()}action/deleteChatMessages`, formData);
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function sendChatMessage(data = {}) {
  let { boardName, postNumber, chatNumber } = data;
  try {
    if (Settings.useWebSockets()) {
      let { message, chatNumber } = await WebSocket.sendMessage('sendChatMessage', data);
      let chats = Storage.chats();
      let key = `${boardName}:${postNumber}:${chatNumber}`;
      if (!chats.hasOwnProperty(key)) {
        chats[key] = [message];
      } else {
        chats[key].push(message);
      }
      Storage.chats(Tools.cloned(chats));
    } else {
      await AJAX.post(`/${Tools.sitePathPrefix()}action/sendChatMessage`, Tools.createFormData(data));
      checkChats();
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function chatWithUser(boardName, postNumber) {
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber) {
    return;
  }
  try {
    let result = await Widgets.prompt({
      id: `chatMessage/${boardName}/${postNumber}`,
      title: Tools.translate('Private chat', 'chatText'),
      type: 'textarea'
    });
    if (!result.accepted || !result.value) {
      return;
    }
    sendChatMessage({
      boardName: boardName,
      postNumber: postNumber,
      text: result.value
    });
  } catch (err) {
    DOM.handleError(err);
  }
}

WebSocket.registerHandler('newChatMessage', (msg) => {
  let chats = Storage.chats();
  let { message, boardName, postNumber, chatNumber } = msg.data;
  let key = `${boardName}:${postNumber}:${chatNumber}`;
  if (!chats.hasOwnProperty(key)) {
    chats[key] = [];
  }
  let list = chats[key];
  if (isDuplicate(message, list)) {
    return;
  }
  message.unread = true;
  list.push(message);
  list.sort(sortMessages);
  Storage.chats(Tools.cloned(chats));
  if (!chatVisible) {
    notifyAboutNewMessage(key);
  }
}, { priority: 0 });
