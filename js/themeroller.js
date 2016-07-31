var lord = lord || _.noConflict();

lord.FONT_WEIGHT = ['bold', 'bolder', 'lighter', 'normal', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
lord.FONT_STYLE = ['normal', 'italic', 'oblique'];

lord.styleTemplate = $('#styleTemplate').html();

lord.color = function(name, value, checkable, checked) {
  var o = {
    name: name,
    type: 'color',
    value: value,
    format: 'hex'
  };
  if (checkable) {
    o.checkable = true;
    o.checked = !!checked;
  }
  return o;
};

lord.fontWeight = function(name, value, checkable, checked) {
  var o = {
    name: name,
    type: 'select',
    value: value || 'normal',
    options: lord.FONT_WEIGHT
  };
  if (checkable) {
    o.checkable = true;
    o.checked = !!checked;
  }
  return o;
};

lord.fontStyle = function(name, value, checkable, checked) {
  var o = {
    name: name,
    type: 'select',
    value: value || 'normal',
    options: lord.FONT_STYLE
  };
  if (checkable) {
    o.checkable = true;
    o.checked = !!checked;
  }
  return o;
};

lord.options = [{
  name: 'font-family',
  type: 'text',
  value: 'Verdana,sans-serif',
  checkable: true,
  checked: true
},
lord.color('color-primary', '#000000'),
lord.color('color-link', '#FF6600'),
lord.color('color-link-hover', '#0066FF'),
lord.color('color-link-button', '#E08060'),
lord.color('color-link-button-hover', '#F09070'),
lord.color('color-quotation', '#789922'),
lord.color('color-warning', '#E08000'),
lord.color('color-critical', '#FF0000'),
lord.color('color-highlighted', '#FFFF00'),
lord.color('color-extra', '#008000'),
lord.color('background-color-primary', '#EEEEEE'),
lord.color('background-color-secondary', '#DDDDDD'),
lord.color('background-color-new', '#CDCDCD'),
lord.color('background-color-targeted', '#EEDACB'),
lord.color('background-color-spoiler', '#BBBBBB'),
lord.color('border-color-primary', '#CCCCCC'),
lord.color('border-color-secondary', '#BBBBBB'),
lord.color('border-color-temporary', '#000000'),
lord.fontWeight('font-weight-primary'),
{
  name: 'border-radius',
  type: 'number',
  min: 0,
  value: 0,
  processor: function(value) {
    return value + 'px';
  }
}, {
  name: 'inversion',
  type: 'number',
  min: 0,
  max: 1,
  value: 0,
  processor: function(value) {
    return 'invert(' + value + ')';
  }
},
lord.color('color-post-subject', '#000000', true),
lord.fontWeight('font-weight-post-subject', 'bold'),
lord.color('color-user-name', '#000000', true),
lord.fontWeight('font-weight-user-name'),
lord.color('color-hiding-reason', '#000000', true),
lord.fontWeight('font-weight-hiding-reason', 'bold'),
lord.color('color-post-name-moder', '#0000FF', true, true),
lord.fontWeight('font-weight-post-name-moder', 'bold'),
lord.color('color-modification-date-time', '#000000', true),
lord.fontStyle('font-style-modification-date-time', 'italic', true, true),
lord.fontStyle('font-style-referring-posts', 'italic', true, true),
{
  name: 'style-name',
  type: 'text',
  value: 'photon'
}, {
  name: 'style-title',
  type: 'text',
  value: 'Photon'
}];

lord.createCheckbox = function(options) {
  var checkbox = lord.node('input');
  checkbox.type = 'checkbox';
  if (options && options.checked) {
    checkbox.checked = true;
  }
  var cb = options && options.callback;
  checkbox.onclick = function() {
    if (typeof cb === 'function') {
      cb(!!checkbox.checked);
    }
  };
  return checkbox;
};

lord.createTextInput = function(options) {
  var input = lord.node('input');
  input.type = 'text';
  input.size = (options && options.size) || 25;
  if (options && typeof options.value !== 'undefined') {
    input.value = options.value;
  }
  var val = input.value;
  var cb = options && options.callback;
  input.oninput = input.onkeyup = input.onkeypress = function() {
    if (val !== input.value && typeof cb === 'function') {
      val = input.value;
      cb(val);
    }
  };
  return input;
};

lord.createSelectInput = function(options) {
  var input = lord.node('select');
  if (options && lord.isArray(options.options)) {
    options.options.forEach(function(option) {
      var opt = lord.node('option');
      opt.appendChild(lord.node('text', '' + option));
      input.appendChild(opt);
    });
  }
  if (options && typeof options.value !== 'undefined') {
    input.value = options.value;
  }
  var val = input.value;
  var cb = options && options.callback;
  input.onchange = function() {
    if (val !== input.value && typeof cb === 'function') {
      val = input.value;
      cb(val);
    }
  };
  return input;
};

lord.createColorInput = function(options) {
  var input = lord.node('input');
  input.type = 'text';
  if (options && typeof options.value === 'string') {
    input.value = options.value;
  }
  let cb = options && options.callback;
  setTimeout(function() {
  $(input).minicolors({
    control: 'wheel',
    position: 'bottom right',
    format: (options && options.format || 'hex'),
    opacity: !!(options && options.opacity)
  }).on('change', function() {
    if (typeof cb === 'function') {
      cb($(input).minicolors('value').toUpperCase().replace('RGBA', 'rgba').replace('RGB', 'rgb'));
    }
  });
  input.size = 14;
  });
  return input;
};

lord.create = function(options) {
  //
};

lord.createNumberInput = function(options) {
  var input = lord.node('input');
  input.type = 'number';
  input.style.width = ((options && options.size) || 6) + 'ch';
  ['min', 'max'].forEach(function(x) {
    if (options && typeof options[x] !== 'undefined') {
      input[x] = options[x];
    }
  });
  if (options && typeof options.value === 'number') {
    input.value = options.value;
  }
  var val = input.value;
  var cb = options && options.callback;
  input.oninput = input.onkeyup = input.onkeypress = function() {
    if (val !== input.value && typeof cb === 'function') {
      val = input.value;
      cb(val);
    }
  };
  return input;
};

lord.variables = {};

lord.createInput = function(name, type, options) {
  options = options || {};
  var c = (options && options.checkable) ? !!options.checked : true;
  var val = options && options.value;
  var cb = function(value, checked) {
    var pure = value;
    if (typeof options.processor === 'function') {
      value = options.processor(value);
    }
    lord.variables[name] = {
      checked: checked,
      value: value,
      pure: pure
    };
    lord.styleChanged();
  };
  options.callback = function(value) {
    val = value;
    if (!c) {
      return;
    }
    cb(val, true);
  };
  switch (type) {
  case 'text':
    var input = lord.createTextInput(options);
    break;
  case 'select':
    var input = lord.createSelectInput(options);
    break;
  case 'color':
    var input = lord.createColorInput(options);
    break;
  case 'radio':
    var input = lord.createRadioInput(options);
    break;
  case 'number':
    var input = lord.createNumberInput(options);
    break;
  case 'value':
    var input = lord.createValueInput(options);
    break;
  default:
    return null;
  }
  input.name = name;
  options.callback = function(checked) {
    c = checked;
    cb(val, c);
  };
  var div = $('<div class="row"></div>');
  var span = $('<span class="nowrap"></span>').text(' ' + name + ': ');
  if (options && options.checkable) {
    span.prepend(lord.createCheckbox(options));
  }
  $('#options').append(div.append(span).append($('<br />')).append(input));
};

lord.node = function(type, text) {
  if (typeof type != "string") {
    return null;
  }
  type = type.toUpperCase();
  return ("TEXT" == type) ? document.createTextNode(text ? text : "") : document.createElement(type);
};

lord.styleChanged = function() {
  if ((lord.styleModifiedManually) && !confirm('You changed the style manually. Overwrite the changes?')) {
    return;
  }
  lord.styleModifiedManually = false;
  lord.styleModifiedProgrammatically = true;
  var less = lord.styleTemplate;
  lord(lord.variables).each(function(value, name) {
    if (value.checked) {
      less = less.split('{{' + name + '}}').join(value.value);
    } else {
      less = less.replace(new RegExp('.*' + name.split('-').join('\\-') + '.*', 'g'), '');
    }
  });
  lord.cssView.setValue(less);
};

lord.previewTheme = function() {
  var style = lord.node('style');
  style.id = 'themeStylesheet';
  style.type = 'text/less';
  var css = lord.cssView.getValue();
  if (style.styleSheet)
    style.styleSheet.cssText = css;
  else
    style.appendChild(lord.node('text', css));
  lord.previewWindow.document.head.replaceChild(style, lord.previewWindow.document.getElementById('themeStylesheet'));
  lord.previewWindow.less.refresh();
};

lord.showHideCSS = function() {
  var show = !!$("#cssView")[0].style.display;
  $("#cssView")[0].style.display = show ? "" : "none";
  $("#cssView").parent().find("a[name='css']").empty().text(show ? "Hide CSS" : "Show CSS");
};

lord.import = function() {
    $("#importInput").click();
};

lord.readyImport = function() {
  var textReader = new FileReader();
  (new Promise(function(resolve, reject) {
    textReader.onload = function(e) {
      resolve(e.target.result);
    };
    textReader.onerror = function(e) {
      reject(e.getMessage());
    };
    textReader.readAsText($("#importInput")[0].files[0]);
  })).then(function(text) {
    try {
      lord.variables = JSON.parse(text);
      lord(lord.variables).each(function(name, value) {
        $('#options [name="' + name + '"]').val(value.pure);
      });
    } catch (err) {
      return Promise.reject(err);
    }
    lord.styleChanged();
  }).catch(function(err) {
    alert(err);
  });
};

lord.export = function() {
  var name = lord.variables['style-name'].value.toLowerCase().replace(/\s\//gi, "-");
  if (!name) {
    return alert("No name specified");
  }
  var blob = new Blob([JSON.stringify(lord.variables, null, 4)], {type: "text/plain;charset=utf-8"});
  saveAs(blob, name + ".json");
};

lord.roll = function() {
  var name = lord.variables['style-name'].value.toLowerCase().replace(/\s\//gi, "-");
  if (!name) {
    return alert("No name specified");
  }
  var title = lord.variables['style-title'].value;
  if (!title) {
    return alert("No title specified");
  }
  var blob = new Blob([lord.cssView.getValue()], {type: "text/plain;charset=utf-8"});
  saveAs(blob, name + ".css");
};

window.addEventListener("load", function load() {
  window.removeEventListener("load", load);
  lord.options.forEach(function(o) {
    lord.createInput(o.name, o.type, o);
    var val = o.value;
    var pure = o.value;
    if (typeof o.processor === 'function') {
      val = o.processor(val);
    }
    lord.variables[o.name] = {
      value: val,
      pure: pure,
      checked: (o.checkable ? o.checked : true)
    };
  });
  lord.cssView = CodeMirror($('#cssView')[0], {
    mode: 'css',
    indentUnit: 2,
    lineNumbers: true,
    value: ''
  });
  lord.cssView.on("change", function() {
    lord.previewTheme();
    if (!lord.styleModifiedProgrammatically) {
      lord.styleModifiedManually = true;
    }
    lord.styleModifiedProgrammatically = false;
  });
  lord.previewWindow = $("#preview > iframe")[0].contentWindow;
  lord.styleChanged();
}, false);
