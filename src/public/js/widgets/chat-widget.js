import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';
import merge from 'merge';

import MovableWidget from './movable-widget';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Chat from '../core/chat';

const SCROLL_ANIMATION_TIME = 100;

export default class ChatWidget extends MovableWidget {
  constructor(options) {
    let key = (options && options.chat && options.chat.key) || '';
    let content = Templating.template('widgets/chatWidget');
    let selectedChatKey = KO.observable(key);
    let message = KO.observable('');
    let messages = KO.computed(() => {
      let chats = Storage.chats();
      return chats[selectedChatKey()] || [];
    });
    let blockScroll = false;
    let scroll = () => {
      if (blockScroll) {
        blockScroll = false;
        return;
      }
      let div = $(content).find('.js-chat-messages');
      div.animate({ scrollTop: div.prop('scrollHeight') }, SCROLL_ANIMATION_TIME);
    };
    messages.subscribe(() => {
      //NOTE: This is NOT OK.
      setTimeout(() => {
        setTimeout(scroll, 10);
      }, 10);
    });
    let sendMessage = () => {
      let key = selectedChatKey();
      Chat.sendChatMessage(key.split(':').shift(), +key.split(':').pop(), message());
      message('');
      $(content).find('.js-chat-input').focus();
    };
    KO.applyBindings({
      chats: KO.computed(() => {
        let chats = Storage.chats();
        return _(chats).map((chat, key) => {
          return {
            key: key,
            messages: chat
          };
        });
      }),
      messages: messages,
      selectedChatKey: selectedChatKey,
      message: message,
      formattedDate: Tools.formattedDate,
      selectChat: function() {
        selectedChatKey(this.key);
      },
      deleteChat: function(_, e) {
        e.stopPropagation();
        selectedChatKey('');
        Chat.deleteChat(this.key);
      },
      markAsRead: function(index) {
        blockScroll = true;
        let chats = Storage.chats();
        let message = chats[selectedChatKey()][index()];
        if (!message.hasOwnProperty('unread')) {
          return;
        }
        delete message.unread;
        Storage.chats(merge(true, chats));
      },
      inputKeyPress: (_, e) => {
        if (13 !== e.keyCode) {
          return true;
        }
        sendMessage();
      },
      sendMessage: sendMessage
    }, content);
    super(content, options);
    if (key) {
      scroll();
    }
  }
}
