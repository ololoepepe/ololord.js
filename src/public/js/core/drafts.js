import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';

import * as AJAX from '../helpers/ajax';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import OverlayProgressBar from '../widgets/overlay-progress-bar';

function fillFormWithDraft(key, createdAt) {
  if (!key || !createdAt) {
    return;
  }
  let drafts = Storage.drafts();
  let list = drafts[key];
  if (!list) {
    return;
  }
  let draft = _(list).find((d) => {
    return createdAt === d.createdAt;
  });
  if (!draft) {
    return;
  }
  let confirmed = window.confirm(Tools.translate('The form is not empty. Do you want to overwrite it?'));
  if (!confirmed) {
    return;
  }
  let postForm = DOM.id('postForm');
  ['name', 'subject', {
    draft: 'rawText',
    form: 'text'
  }, {
    draft: 'options.signAsOp',
    form: 'signAsOp',
    type: 'checkbox'
  }, {
    draft: 'options.showTripcode',
    form: 'tripcode',
    type: 'checkbox'
  }, {
    draft: 'options.sage',
    form: 'sage',
    type: 'checkbox'
  }, {
    draft: 'options.markupMode',
    form: 'markupMode'
  }].forEach((name) => {
    let draftName = (typeof name === 'object') ? name.draft : name;
    let formName = ((typeof name === 'object') ? name.form : name) || draftName;
    let type = (typeof name === 'object' && name.type) || 'text';
    let value = _(draftName).contains('.') ? draftName.split('.').reduce((acc, part) => acc[part], draft)
      : draft[draftName];
    switch (type) {
    case 'checkbox': {
      let input = DOM.nameOne(formName, postForm);
      input.checked = !!value;
      break;
    }
    case 'text':
    case 'select':
    default: {
      DOM.nameOne(formName, postForm).value = value || '';
      break;
    }
    }
  });
}

function deleteDraft(key, createdAt) {
  if (!key || !createdAt) {
    return;
  }
  let drafts = Storage.drafts();
  let list = drafts[key];
  if (!list) {
    return;
  }
  let any = list.some((d, i) => {
    if (createdAt == d.createdAt) {
      list.splice(i, 1);
      return true;
    }
  });
  if (!any) {
    return;
  }
  if (list.length < 1) {
    delete drafts[key];
    Storage.draftsVisible(false);
  }
  Storage.drafts(Tools.cloned(drafts));
}

export async function addToDrafts() {
  let postForm = DOM.id('post-form');
  let boardName = DOM.nameOne('boardName', postForm).value;
  let threadNumber = Tools.option(DOM.nameOne('threadNumber', postForm), 'number', 0, { test: Tools.testPostNumber });
  let data = {
    boardName: boardName,
    text: DOM.nameOne('text', postForm).value,
    markupMode: Settings.markupMode()
  };
  if (DOM.nameOne('signAsOp', postForm).checked) {
    data.signAsOp = 'true';
  }
  let tripcodeCheckbox = DOM.nameOne('tripcode', postForm);
  if (tripcodeCheckbox && tripcodeCheckbox.checked) {
    data.tripcode = 'true';
  }
  try {
    let result = await AJAX.post(`/${Tools.sitePathPrefix()}action/markupText`, Tools.createFormData(data),
      new OverlayProgressBar());
    if (DOM.nameOne('sage', postForm).checked) {
      result.options.sage = true;
    }
    result.name = DOM.nameOne('name', postForm).value;
    result.subject = DOM.nameOne('subject', postForm).value;
    result.options.markupMode = Settings.markupMode();
    let key = boardName + (threadNumber ? ('/' + threadNumber) : '');
    result.key = key;
    let drafts = Storage.drafts();
    if (!drafts.hasOwnProperty(key)) {
      drafts[key] = [];
    }
    drafts[key].push(result);
    Storage.drafts(Tools.cloned(drafts));
    Storage.draftsVisible(true);
  } catch (err) {
    DOM.handleError(err);
  }
};

export function initializeDrafts() {
  let draftsNode = $('#drafts')[0];
  if (!draftsNode) {
    return;
  }
  KO.applyBindings({
    draftsVisible: Storage.draftsVisible,
    toggleDraftsVisibility: () => {
      Storage.draftsVisible(!Storage.draftsVisible());
    }
  }, $('#drafts-visibility-switch')[0]);
  let threadNumber = Tools.threadNumber();
  let key = Tools.boardName() + (threadNumber ? ('/' + threadNumber) : '');
  KO.applyBindings({
    draftsVisible: Storage.draftsVisible,
    userLevel: Templating.createUser().level(Tools.boardName()),
    drafts: KO.computed(() => {
      let drafts = Storage.drafts();
      return drafts[key] || [];
    }),
    deleteDraft: function() {
      deleteDraft(key, this.createdAt);
    },
    fillFormWithDraft: function() {
      fillFormWithDraft(key, this.createdAt);
    },
    compareRegisteredUserLevels: Tools.compareRegisteredUserLevels,
    formattedDate: Tools.formattedDate
  }, draftsNode);
}
