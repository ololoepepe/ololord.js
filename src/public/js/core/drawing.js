import _ from 'underscore';
import $ from 'jquery';

import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Tools from '../helpers/tools';
import * as FileInputs from './file-inputs';
import * as Widgets from '../widgets';

const IMAGE_LOAD_TIMEOUT = 15 * Constants.SECOND;
const DRAWING_WIDGET_WIDTH = 600;
const DRAWING_WIDGET_HEIGHT = 500;
const DEFAULT_DRAWN_FILE_NAME = 'drawn.png';
const EDITED_FILE_POSTFIX = '-edited.png';

async function showDrawingOptions({ drawingOnImage } = {}) {
  let options = {
    id: 'drawingOptionsWidget',
    type: 'drawingOptionsWidget',
    title: Tools.translate('Drawing options', 'drawingOptionsDialogTitle'),
    rememberGeometry: true,
    drawingOnImage: drawingOnImage
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: 550,
      height: 280
    };
  } else {
    options.maximized = true;
  }
  return await Widgets.showWidget(null, options).promise;
}

function attachDrawnFile(lc, fileName, div) {
  div = div || _($('#post-form .file-input')).last();
  if (!div) {
    return;
  }
  FileInputs.clearFileInput(div);
  if (fileName) {
    fileName = `${fileName.split('.').slice(0, -1).join('.')}${EDITED_FILE_POSTFIX}`;
  } else {
    fileName = DEFAULT_DRAWN_FILE_NAME;
  }
  div.file = Tools.lcToFile(lc, fileName);
  FileInputs.fileAddedCommon(div);
}

function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    let timer = setTimeout(reject.bind(null, Tools.translate('Image load timeout')), IMAGE_LOAD_TIMEOUT);
    let img = new Image();
    img.onload = function() {
      clearTimeout(timer);
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.src = url;
  });
}

async function draw(drawingOptions) {
  let options = {
    id: 'drawingWidget',
    type: 'drawingWidget',
    title: Tools.translate('Drawing', 'drawingDialogTitle'),
    drawing: drawingOptions
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: DRAWING_WIDGET_WIDTH,
      height: DRAWING_WIDGET_HEIGHT
    };
  } else {
    options.maximized = true;
  }
  let widget = Widgets.showWidget(null, options);
  let result = await widget.promise;
  return {
    accepted: result,
    lc: widget.lc
  };
}

export async function drawOnImage(file) {
  if (!file) {
    return;
  }
  try {
    let result = await showDrawingOptions({ drawingOnImage: true });
    if (!result) {
      return;
    }
    result = await draw({
      width: +DOM.data('width', file),
      height: +DOM.data('height', file),
      imageUrl: DOM.data('href', file),
      backgroundColor: Settings.drawingBackgroundColor(),
      backgroundDrawable: Settings.drawingBackgroundDrawable()
    });
    if (!result.accepted) {
      return;
    }
    attachDrawnFile(result.lc, DOM.data('fileName', file));
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function attachFileByDrawing(div) {
  if (!div) {
    return;
  }
  let file = div.file || div.fileBackup;
  try {
    if (file && file.name && /\.(jpe?g|png|gif)$/i.test(file.name)) {
      let url = await Tools.readAs(file, 'DataURL');
      var options = await getImageDimensions(url);
      options.imageUrl = url;
      let result = await showDrawingOptions({ drawingOnImage: true });
      if (!result) {
        return;
      }
      options.backgroundColor = Settings.drawingBackgroundColor();
      options.backgroundDrawable = Settings.drawingBackgroundDrawable();
    } else {
      let result = await showDrawingOptions();
      if (!result) {
        return;
      }
      var options = {
        width: Settings.drawingBackgroundWidth(),
        height: Settings.drawingBackgroundHeight(),
        backgroundColor: Settings.drawingBackgroundColor()
      };
    }
    let result = await draw(options);
    if (!result.accepted) {
      return;
    }
    attachDrawnFile(result.lc, file && file.name, div);
  } catch (err) {
    DOM.handleError(err);
  }
}
