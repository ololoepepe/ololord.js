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
const MAX_SCROLL_DY = 50;

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
    let mustScroll = !!key;
    selectedChatKey.subscribe((k) => {
      mustScroll = !!k;
    });
    let messagesDiv = $(content).find('.js-chat-messages');
    let scroll = () => {
      messagesDiv.animate({ scrollTop: messagesDiv.prop('scrollHeight') }, SCROLL_ANIMATION_TIME);
    };
    function setMustScroll() {
      let max = +messagesDiv.prop('scrollHeight') - messagesDiv.height();
      let dy = max - messagesDiv.scrollTop();
      mustScroll = (dy <= MAX_SCROLL_DY);
    }
    messagesDiv.scroll(function(e) {
      if (!$(this).is(':animated')) {
        setMustScroll();
      }
    });
    let sendMessage = () => {
      let key = selectedChatKey();
      let [boardName, postNumber, chatNumber] = key.split(':');
      Chat.sendChatMessage({
        boardName: boardName,
        postNumber: +postNumber,
        chatNumber: +chatNumber,
        text: message()
      });
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
      afterRender: (elements, data) => {
        if (Chat.messagesEqual(data, messages()[messages().length - 1])) {
          if (mustScroll) {
            scroll();
          }
        }
      },
      markAsRead: (index) => {
        setMustScroll();
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
  }
}
