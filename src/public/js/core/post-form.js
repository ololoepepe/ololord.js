import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';

import * as AJAX from '../helpers/ajax';
import * as DOM from '../helpers/dom';
import * as Navigation from '../helpers/navigation';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Drafts from './drafts';
import * as FileInputs from './file-inputs';
import * as Files from './files';
import * as Hotkeys from './hotkeys';
import * as Markup from './markup';
import * as Posts from './posts';
import * as Threads from './threads';
import * as Captcha from '../captcha';
import * as PostProcessors from '../handlers/post-processors';
import * as Widgets from '../widgets';
import OverlayProgressBar from '../widgets/overlay-progress-bar';
import PopupMessage from '../widgets/popup-message';

const MARKUP_DELTA_WIDTH = 8;

let floatingPostForm = false;
let visiblePostFormContainerPosition = KO.observable('');
let sageEnabled = KO.observable(Storage.sageEnabled());
let showTripcode = KO.observable(Storage.showTripcode());
let submitHandlers = [];

function postFormFixedButtonTitle() {
  return Storage.postFormFixed() ? Tools.translate('Fixed', 'postFormFixedButtonText')
    : Tools.translate('Not fixed', 'postFormUnfixedButtonText');
}

function makeFormFloat({ previousPosition } = {}) {
  let postForm = $('#post-form');
  let container = postForm.parent();
  let header = postForm.find('.post-form-header');
  header.hide();
  let options = {
    id: 'floatingPostForm',
    buttons: [],
    headerButtons: {
      title: postFormFixedButtonTitle(),
      class: `icon ${(Storage.postFormFixed() ? 'icon-pin-16' : 'icon-unpin-16')} button-icon`,
      action: (btn) => {
        let fixed = !Storage.postFormFixed();
        Storage.postFormFixed(fixed);
        btn.removeClass('icon-pin-16 icon-unpin-16').addClass(fixed ? 'icon-pin-16' : 'icon-unpin-16')
        .attr('title', postFormFixedButtonTitle());
      }
    },
    resizable: false,
    rememberGeometry: true
  };
  if (!previousPosition) {
    options.position = postForm.offset();
    options.position.top -= $(window.document).scrollTop();
  }
  floatingPostForm = Widgets.showWidget(postForm, options).on('hide', () => {
    container.append(postForm);
    header.show();
    floatingPostForm = null;
    hidePostForm();
    if (!Storage.postFormFixed()) {
      Storage.postFormFloating(false);
    }
  });
  if (/^post\-form\-container\-/.test(container.attr('id'))) {
    container.hide();
    visiblePostFormContainerPosition('');
  }
  Storage.postFormFloating(true);
}

function togglePostFormVisibility(position) {
  let postForm = $('#post-form');
  resetTarget(Tools.threadNumber());
  if (floatingPostForm) {
    if (Storage.postFormFixed()) {
      return;
    }
    floatingPostForm.hide();
  }
  if (Storage.postFormFloating()) {
    makeFormFloat({ previousPosition: true });
    return;
  }
  let containerID = `post-form-container-${position}`;
  if (postForm.parent().css('display') === 'none' || postForm.parent().attr('id') !== containerID) {
    $(`#${containerID}`).append(postForm).show();
    visiblePostFormContainerPosition(position);
  } else {
    if (!floatingPostForm) {
      hidePostForm();
    }
    visiblePostFormContainerPosition('');
  }
}

function resetTarget(threadNumber) {
  let postForm = $('#post-form');
  let hiddenSection = postForm.find('.js-post-form-hidden-section');
  let inputThread = hiddenSection.find('[name="threadNumber"]');
  if (threadNumber) {
    postForm.attr('action', postForm.attr('action').replace('createThread', 'createPost'));
    if (inputThread[0]) {
      inputThread.val(threadNumber);
    } else {
      hiddenSection.append($(`<input type='hidden' name='threadNumber' value='${threadNumber}' />`));
    }
    $('#post-form-option-op, #post-form-option-op + label').show();
  } else {
    postForm.attr('action', postForm.attr('action').replace('createPost', 'createThread'));
    inputThread.remove();
    $('#post-form-option-op, #post-form-option-op + label').hide();
  }
}

export function quickReply(postNumber, threadNumber) {
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber || !threadNumber) {
    return;
  }
  let post = $(`#post-${postNumber}`);
  if (!post[0]) {
    return;
  }
  let postForm = $('#post-form');
  let selection = window.document.getSelection().toString();
  resetTarget(threadNumber);
  if (floatingPostForm) {
    if (!Storage.postFormFixed()) {
      floatingPostForm.hide();
      post.after(postForm);
    }
  } else if (Storage.postFormFloating()) {
    makeFormFloat({ previousPosition: true });
  } else {
    hidePostForm();
    post.after(postForm);
    resetTarget(threadNumber); //NOTE: Required after hidePostForm() call
  }
  insertPostNumber(postNumber);
  Markup.quoteSelectedText(selection);
}

function hidePostForm() {
  let postForm = $('#post-form');
  resetTarget(Tools.threadNumber());
  let container = postForm.parent();
  if (/^post\-form\-container\-/.test(container.attr('id'))) {
    container.hide();
  } else {
    $('#post-form-container-top').append(postForm).hide();
  }
  visiblePostFormContainerPosition('');
}

export let insertPostNumber = function(postNumber) {
  //TODO: test of posting is enabled
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  try {
    let field = DOM.nameOne('text', DOM.id('postForm'));
    let value = `>>${postNumber}\n`;
    let startPos = field.selectionStart;
    let endPos = field.selectionEnd;
    field.value = field.value.substring(0, startPos) + value + field.value.substring(endPos);
    let pos = ((startPos < endPos) ? startPos : endPos) + value.length;
    field.setSelectionRange(pos, pos);
    field.focus();
  } catch (err) {
    console.log(err);
  }
  return true;
};

function resetPostForm() {
  let postForm = $('#post-form');
  postForm.find('[name="name"], [name="subject"], [name="text"]').val('');
  postForm.find('[name="signAsOp"]').prop('checked', false);
  DOM.queryAll('.file-input', postForm[0]).reverse().forEach(FileInputs.removeFile);
  if (typeof window.lord.emit === 'function') {
    window.lord.emit('postFormReset');
  }
}

export function registerSubmitHandler(handler) {
  if (typeof handler !== 'function') {
    return;
  }
  submitHandlers.push(handler);
}

export async function submit() {
  let form = $('#post-form');
  let btn = form.find('[name="submit"]');
  btn.prop('disabled', true);
  let interrupted = false;
  await Tools.series(submitHandlers, async function(handler) {
    if (interrupted) {
      return;
    }
    let result = await handler(form);
    if (typeof result !== 'undefined' && !result) {
      interrupted = true;
    }
  });
  if (interrupted) {
    btn.prop('disabled', false);
    return;
  }
  let formData = Tools.createFormData(form[0]);
  try {
    let result = await AJAX.post(form.attr('action'), formData, new OverlayProgressBar());
    let ownPosts = Storage.ownPosts();
    ownPosts[`${result.boardName}/${result.postNumber || result.threadNumber}`] = 1;
    Storage.ownPosts(Tools.cloned(ownPosts));
    if (result.postNumber) {
      btn.prop('disabled', false);
      let threadNumber = form.find('[name="threadNumber"]').val();
      resetPostForm();
      if (!/^post\-form\-container\-/.test(form.parent().attr('id'))
        && (!floatingPostForm || !Storage.postFormFixed())) {
        hidePostForm();
      }
      Captcha.resetCaptcha();
      if (Tools.isThreadPage()) {
        await Threads.updateThread(true);
        if (Settings.moveToPostOnReplyInThread()) {
          DOM.hash(`post-${result.postNumber}`);
        }
      } else {
        if ('goto_thread' === Settings.quickReplyAction()) {
          let hash = `#post-${result.postNumber}`;
          let href = `/${Tools.sitePathPrefix()}${result.boardName}/res/${result.threadNumber}.html${hash}`;
          await Navigation.setPage(href);
          return;
        } else if (threadNumber) {
          let threadPosts = $(`#thread-${threadNumber} .js-thread-posts`);
          let post = await AJAX.api('post', {
            boardName: result.boardName,
            postNumber: result.postNumber
          });
          post = await Posts.createPostNode(post, true);
          threadPosts.append(post);
          await PostProcessors.applyPostprocessors(post);
          Files.initializeFiles();
        }
      }
    } else {
      btn.prop('disabled', false);
      await Navigation.setPage(`/${Tools.sitePathPrefix()}${result.boardName}/res/${result.threadNumber}.html`);
    }
  } catch (err) {
    btn.prop('disabled', false);
    Captcha.resetCaptcha();
    DOM.handleError(err);
  }
}

export function initialize() {
  KO.applyBindings({
    submit: submit,
    makeFormFloat: () => {
      if (Tools.deviceType('mobile')) {
        return;
      }
      if (floatingPostForm) {
        return;
      }
      makeFormFloat();
    },
    close: () => {
      if (floatingPostForm) {
        floatingPostForm.hide();
      } else {
        hidePostForm();
      }
    },
    countSymbols: () => {
      $('#post-form .js-symbols-used').empty().text($('#post-form [name="text"]').val().length);
      return true;
    },
    toggleSageEnabled: () => {
      let enabled = !Storage.sageEnabled();
      Storage.sageEnabled(enabled);
      sageEnabled(enabled);
      return true;
    },
    toggleShowTripcode: () => {
      let show = !Storage.showTripcode();
      Storage.showTripcode(show);
      showTripcode(show);
      return true;
    },
    toggleMarkupVisibility: () => {
      Settings.hidePostFormMarkup(!Settings.hidePostFormMarkup());
    },
    toggleRulesVisibility: () => {
      Settings.hidePostFormRules(!Settings.hidePostFormRules());
    },
    addToDrafts: Drafts.addToDrafts,
    markup: (tag) => {
      Markup.markup(tag);
    },
    settings: Settings,
    password: Storage.password,
    sageEnabled: sageEnabled,
    showTripcode: showTripcode,
    shortcutSuffix: Hotkeys.shortcutSuffix,
    showMenuMarkupUnorderedList: (_, e) => {
      Widgets.showMenu(e);
    },
    showMenuMarkupOrderedList: (_, e) => {
      Widgets.showMenu(e);
    },
    changeLastCodeLang: () => {
      Storage.lastCodeLang($('#markup .js-code-lang-select').val());
      return true;
    }
  }, DOM.id('post-form'));
  $('.js-post-form-container').hide().removeClass('no-js-only');
  $('.js-toggle-post-form-visibility-button').each(function() {
    KO.applyBindings({
      togglePostFormVisibility: togglePostFormVisibility,
      visiblePostFormContainerPosition: visiblePostFormContainerPosition
    }, this);
  });
  if (!Tools.isThreadPage()) {
    $('#post-form-option-op, #post-form-option-op + label').hide();
  }
  $('#markup .js-code-lang-select').val(Storage.lastCodeLang());
  let board = Templating.board(Tools.boardName());
  if (board.maxFileCount > 0) {
    $('#post-form .js-file-inputs').empty().append(FileInputs.createFileInput());
  }
  if (board.captchaEnabled) {
    Captcha.createCaptcha();
  }
}
