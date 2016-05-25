var lord = lord || _.noConflict();

lord.node = function(type, text) {
    if (typeof type != "string")
        return null;
    type = type.toUpperCase();
    return ("TEXT" == type) ? document.createTextNode(text ? text : "") : document.createElement(type);
};

lord.getAttributeValue = function(data) {
    if ("value" == data.type)
        return data.value;
    var el = $(data.selector);
    switch (data.type) {
    case "checkbox":
        return !!el[0].checked;
    case "minicolors":
        return el.minicolors("value");
    case "number":
        return +el[0].value;
    case "text":
    case "select":
    default:
        return el[0].value;
    }
};

lord.createTheme = function() {
    var s = "";
    lord.each({
        "body": {
            "background-color": {
                selector: "#bodyBackgroundColor",
                type: "minicolors"
            },
            "font-family": {
                selector: "#bodyFontFamily",
                type: "text"
            },
            "color": {
                selector: "#bodyFontColor",
                type: "minicolors"
            },
            "font-weight": {
                selector: "#bodyFontWeight",
                type: "select"
            }
        },
        ".post": {
            "background-color": {
                selector: "#postBackgroundColor",
                type: "minicolors"
            },
            "border": [
                {
                    selector: "#postBorderWidth",
                    type: "select"
                },
                {
                    selector: "#postBorderType",
                    type: "select"
                },
                {
                    selector: "#postBorderColor",
                    type: "minicolors"
                }
            ]
        },
        ".post:not(.hidden)": {
            enabledSelector: "#postIcon",
            "background-image": {
                type: "value",
                value: "url(\"../favicon.ico\")"
            },
            "background-position": {
                type: "value",
                value: "right bottom"
            },
            "background-repeat": {
                type: "value",
                value: "no-repeat"
            }
        },
        ".opPost": {
            "background-color": {
                enabledSelector: "#postOPBackgroundColorEnabled",
                selector: "#postOPBackgroundColor",
                type: "minicolors"
            },
            "border": [
                {
                    enabledSelector: "#postOPBorderEnabled",
                    selector: "#postOPBorderWidth",
                    type: "select"
                },
                {
                    enabledSelector: "#postOPBorderEnabled",
                    selector: "#postOPBorderType",
                    type: "select"
                },
                {
                    enabledSelector: "#postOPBorderEnabled",
                    selector: "#postOPBorderColor",
                    type: "minicolors"
                }
            ]
        },
        ".opPost:not(.hidden)": {
            enabledSelector: "#postOPIcon",
            "background-image": {
                type: "value",
                value: "url(\"../favicon.ico\")"
            },
            "background-position": {
                type: "value",
                value: "right bottom"
            },
            "background-repeat": {
                type: "value",
                value: "no-repeat"
            }
        },
        ".post.target, .opPost.target": {
            "background-color": {
                enabledSelector: "#postTargetedBackgroundColorEnabled",
                selector: "#postTargetedBackgroundColor",
                type: "minicolors"
            },
            "border": [
                {
                    enabledSelector: "#postTargetedBorderEnabled",
                    selector: "#postTargetedBorderWidth",
                    type: "select"
                },
                {
                    enabledSelector: "#postTargetedBorderEnabled",
                    selector: "#postTargetedBorderType",
                    type: "select"
                },
                {
                    enabledSelector: "#postTargetedBorderEnabled",
                    selector: "#postTargetedBorderColor",
                    type: "minicolors"
                }
            ]
        },
        ".post.temporary": {
            "border": [
                {
                    enabledSelector: "#postTemporaryBorderEnabled",
                    selector: "#postTemporaryBorderWidth",
                    type: "select"
                },
                {
                    enabledSelector: "#postTemporaryBorderEnabled",
                    selector: "#postTemporaryBorderType",
                    type: "select"
                },
                {
                    enabledSelector: "#postTemporaryBorderEnabled",
                    selector: "#postTemporaryBorderColor",
                    type: "minicolors"
                }
            ]
        },
        ".ui-state-active > .ui-button-text > .signImage, .selectOption, .noInvert, .track:hover > span > a > img, .track.selected > span > a > img": {
            enabledSelector: "#invertImages",
            "-webkit-filter": {
                enabledSelector: "#invertImages",
                type: "value",
                value: "invert(0)"
            },
            "filter": {
                enabledSelector: "#invertImages",
                type: "value",
                value: "invert(0)"
            }
        },
        ".invertableImage, .buttonImage, .signImage, .boardSelect, #recaptcha_logo": {
            enabledSelector: "#invertImages",
            "-webkit-filter": {
                type: "value",
                value: "invert(1)"
            },
            "filter": {
                type: "value",
                value: "invert(1)"
            }
        },
        "a": {
            "color": {
                type: "minicolors",
                selector: "#linkFontColor"
            }
        },
        "a:hover": {
            "color": {
                type: "minicolors",
                selector: "#linkHoverFontColor"
            }
        },
        ".cspoilerTitle": {
            "color": {
                type: "minicolors",
                selector: "#collapsibleTitleFontColor"
            }
        },
        ".cspoilerTitle:hover": {
            "color": {
                type: "minicolors",
                selector: "#collapsibleTitleHoverFontColor"
            }
        },
        ".cspoilerBody": {
            "background-color": {
                type: "minicolors",
                selector: "#collapsibleBodyBackgroundColor"
            },
            "border": [
                {
                    selector: "#collapsibleBodyBorderWidth",
                    type: "select"
                },
                {
                    selector: "#collapsibleBodyBorderType",
                    type: "select"
                },
                {
                    selector: "#collapsibleBodyBorderColor",
                    type: "minicolors"
                }
            ]
        },
        "a.expandCollapse": {
            "color": {
                type: "minicolors",
                selector: "#collapsibleTitleFontColor"
            }
        },
        "a.expandCollapse:hover": {
            "color": {
                type: "minicolors",
                selector: "#collapsibleTitleHoverFontColor"
            }
        }
    }, function(attributes, selector) {
        if (attributes.enabledSelector) {
            var el = $(attributes.enabledSelector);
            if (!el[0] || !el[0].checked)
                return;
        }
        var ss = "";
        lord.each(attributes, function(data, attribute) {
            if ("enabledSelector" == attribute)
                return;
            if (!lord.isArray(data))
                data = [data];
            var sss = "";
            lord.each(data, function(item, i) {
                if (item.enabledSelector) {
                    var el = $(item.enabledSelector);
                    if (!el[0] || !el[0].checked)
                        return;
                }
                var val = lord.getAttributeValue(item);
                sss += val;
                if (!isNaN(+val))
                    sss += "px";
                if (i < data.length - 1)
                    sss += " ";
            });
            if (!sss)
                return;
            ss += "    " + attribute + ": " + sss + ";\n";
        });
        if (!ss)
            return;
        s += selector + " {\n" + ss + "}\n\n";
    });
    return s.replace(/\n\n$/, "");
};

lord.previewTheme = function() {
    var style = lord.node("style");
    style.id = "themeStylesheet";
    style.type = "text/css";
    var css = lord.createTheme();
    if (style.styleSheet)
        style.styleSheet.cssText = css;
    else
        style.appendChild(lord.node("text", css));
    lord.previewWindow.document.head.replaceChild(style, lord.previewWindow.document.getElementById("themeStylesheet"));
    lord.cssView.setValue(css);
};

lord.showHideCSS = function() {
    var show = !!$("#cssView")[0].style.display;
    $("#cssView")[0].style.display = show ? "" : "none";
    $("#cssView").parent().find("a").empty().text(show ? "Hide CSS" : "Show CSS");
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load);
    $("#options > div").accordion({
        collapsible: true,
        heightStyle: "content",
        icons: false,
        header: ".accordionHeader",
        active: false
    });
    $(".hexColor").minicolors({
        control: "wheel",
        position: "bottom right",
        format: "hex"
    });
    $(".rgbaColor").minicolors({
        control: "wheel",
        position: "bottom right",
        format: "rgb",
        opacity: true
    });
    $(".sectionBody input, .sectionBody select").on("change", function() {
        lord.previewTheme();
    });
    lord.cssView = CodeMirror($("#cssView")[0], {
        mode: "css",
        indentUnit: 4,
        lineNumbers: true,
        value: ""
    });
    lord.previewWindow = $("#preview > iframe")[0].contentWindow;
    lord.previewTheme();
}, false);
