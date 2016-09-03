import $ from 'jquery';
import KO from 'knockout';

import MovableWidget from './movable-widget';
import * as Settings from '../helpers/settings';
import * as Templating from '../helpers/templating';

export default class DrawingOptionsWidget extends MovableWidget {
  constructor(options) {
    if (typeof options !== 'object') {
      options = {};
    }
    options.buttons = ['ok', 'cancel'];
    let drawingOnImage = options && options.drawingOnImage;
    let content = Templating.template('widgets/drawingOptionsWidget', { drawingOnImage: drawingOnImage });
    let colorInput = $('.js-minicolors', content);
    colorInput.minicolors({
      control: 'wheel',
      position: 'bottom right',
      format: 'rgb',
      opacity: true,
      defaultValue: Settings.DEFAULT_DRAWING_BACKGROUND_COLOR,
      change: () => {
        Settings.drawingBackgroundColor(colorInput.minicolors('value'));
      }
    }).css('width', 'calc(25ch + 4px)');
    //NOTE: This is a hack
    setTimeout(() => { colorInput.minicolors('value', Settings.drawingBackgroundColor()) }, 0);
    KO.applyBindings({
      settings: Settings,
      resetBackgroundColor: () => {
        colorInput.minicolors('value', Settings.DEFAULT_DRAWING_BACKGROUND_COLOR);
        Settings.drawingBackgroundColor(Settings.DEFAULT_DRAWING_BACKGROUND_COLOR);
      },
      setDrawingDimensions: (width, height) => {
        Settings.drawingBackgroundWidth(width);
        Settings.drawingBackgroundHeight(height);
      }
    }, content);
    super(content, options);
  }
}
