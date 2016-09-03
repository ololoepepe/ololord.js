import $ from 'jquery';
import LC from 'literallycanvas';
import moment from 'moment/min/moment-with-locales';
import { saveAs } from 'node-safe-filesaver';

import MovableWidget from './movable-widget';
import * as Tools from '../helpers/tools';

const SAVED_FILE_PREFIX = 'drawn-';
const SAVED_FILE_POSTFIX = '.png';
const SAVED_FILE_DATE_FORMAT = 'YYYY-DD-MM-HH-mm';

function initializeLC({ imageUrl, width, height, backgroundColor, backgroundDrawable } = {}) {
  if (imageUrl) {
    let backgroundImage = new Image();
    backgroundImage.src = imageUrl.replace(/^https?\:\/\/[^\/]+/, '');
    var backgroundShape = LC.createShape('Image', {
      x: 0,
      y: 0,
      image: backgroundImage
    });
  }
  this.lc = LC.init(this.contentWrapper[0], {
    imageURLPrefix: `/${Tools.sitePathPrefix()}img/3rdparty/literallycanvas`,
    imageSize: {
      width: Tools.option(width, 'number', 0, { test: (w) => { return w > 0; } }),
      height: Tools.option(height, 'number', 0, { test: (h) => { return h > 0; } })
    },
    backgroundColor: Tools.option(backgroundColor, 'string', 'rgba(255, 255, 255, 0)'),
    backgroundShapes: ((typeof backgroundShape !== 'undefined' && !backgroundDrawable) ? [backgroundShape] : undefined)
  });
  if (typeof backgroundShape !== 'undefined' && backgroundDrawable) {
    this.lc.saveShape(backgroundShape);
  }
  this.contentWrapper.find('.literally').css({
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: '100%',
    height: 'calc(100% - 8px)'
  });
  let checkerboardBackground = $('<div class="lc-drawing with-gui background-checkerboard"></div>');
  let canvas = this.contentWrapper.find('canvas');
  this.contentWrapper.find('.literally').prepend(checkerboardBackground);
  let resize = (n) => {
    n = n || 1;
    this.lc.respondToSizeChange();
    checkerboardBackground.width(canvas.width()).height(canvas.height());
    if (n > 100) {
      return;
    }
    //NOTE: This is a hack.
    setTimeout(() => {
      resize(n * 10);
    }, n);
  };
  this.on('show', resize).on('resizeStop', resize);
}

export default class DrawingWidget extends MovableWidget {
  constructor(options) {
    if (typeof options !== 'object') {
      options = {};
    }
    options.buttons = [
      {
        title: Tools.translate('Save the drawing', 'saveDrawingButtonText'),
        action: () => {
          let fileName = `${SAVED_FILE_PREFIX}${moment().format(SAVED_FILE_DATE_FORMAT)}${SAVED_FILE_POSTFIX}`;
          saveAs(Tools.lcToFile(this.lc, fileName), fileName);
        }
      },
      'ok',
      'cancel'
    ];
    super(null, options);
    initializeLC.call(this, options.drawing);
  }
}
