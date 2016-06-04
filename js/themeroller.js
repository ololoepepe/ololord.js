var lord = lord || _.noConflict();

lord.styleSelectors = {
    "body": {
        "background-color": {
            selector: "#bodyBackgroundColor",
            type: "minicolors"
        },
        "font-family": {
            enabledSelector: "#bodyFontFamilyEnabled",
            selector: "#bodyFontFamily",
            type: "text"
        },
        "font-size": {
            enabledSelector: "#defaultBodyFontSize",
            type: "value",
            value: "inherit"
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
    "hr": {
        "height": {
            enabledSelector: "#hrNormalEnabled",
            selector: "#hrHeight",
            type: "number"
        },
        "border": {
            disabledSelector: "#hrDefaultEnabled",
            type: "value",
            value: "none"
        },
        "color": {
            enabledSelector: "#hrNormalEnabled",
            selector: "#hrColor",
            type: "minicolors"
        },
        "background-color": {
            enabledSelector: "#hrNormalEnabled",
            selector: "#hrColor",
            type: "minicolors"
        },
        "clear": {
            enabledSelector: "#hrNormalEnabled",
            type: "value",
            value: "both"
        },
        "background": [
            {
                enabledSelector: "#hrImageEnabled",
                type: "value",
                value: "url(\""
            },
            {
                enabledSelector: "#hrImageEnabled",
                selector: "#hrImageSource"
            },
            {
                enabledSelector: "#hrImageEnabled",
                type: "value",
                value: "\") center no-repeat"
            }
        ],
        "background-size": {
            enabledSelector: "#hrImageEnabled",
            type: "value",
            value: "100% 100%"
        }
    },
    ".post, .draft, .catalogItem, .searchResult, .searchAction > form": {
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
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
    ".newPost": {
        "background-color": {
            enabledSelector: "#postNewBackgroundColorEnabled",
            selector: "#postNewBackgroundColor",
            type: "minicolors"
        },
        "border": [
            {
                enabledSelector: "#postNewBorderEnabled",
                selector: "#postNewBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#postNewBorderEnabled",
                selector: "#postTargetedBorderType",
                type: "select"
            },
            {
                enabledSelector: "#postNewBorderEnabled",
                selector: "#postNewBorderColor",
                type: "minicolors"
            }
        ]
    },
    ".post:target, .opPost:target": {
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
    "#sidebar": {
        "background-color": {
            selector: "#bodyBackgroundColor",
            type: "minicolors"
        },
        "border-right": [
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
    "#sidebarContent": {
        "border-top": [
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
    "#postForm": {
        "background-color": {
            selector: "#bodyBackgroundColor",
            type: "minicolors"
        }
    },
    "#postForm.floatingPostForm": {
        "border": [
            {
                type: "value",
                value: "2px solid"
            },
            {
                selector: "#postBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".ui-state-active > .ui-button-text > .signImage, .selectOption, .noInvert, .track:hover > span > a > img, .track.selected > span > a > img": {
        enabledSelector: "#invertImageColors",
        "-webkit-filter": {
            type: "value",
            value: "invert(0)"
        },
        "filter": {
            type: "value",
            value: "invert(0)"
        }
    },
    ".invertableImage, .buttonImage, .signImage, .boardSelect, #recaptcha_logo, .ui-icon": {
        enabledSelector: "#invertImageColors",
        "-webkit-filter": {
            type: "value",
            value: "invert(1)"
        },
        "filter": {
            type: "value",
            value: "invert(1)"
        }
    },
    ".halfTransparentBackground": {
        enabledSelector: "#invertImageColors",
        "background-color": {
            type: "value",
            value: "rgba(255, 255, 255, 0.5)"
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
    ".spoiler": {
        "background-color": {
            type: "minicolors",
            selector: "#spoilerBackgroundColor"
        },
        "color": {
            type: "minicolors",
            selector: "#spoilerBackgroundColor"
        }
    },
    ".spoiler:hover": {
        "background-color": {
            enabledSelector: "#spoilerHoverBackgroundColorEnabled",
            type: "minicolors",
            selector: "#spoilerHoverBackgroundColor"
        },
        "color": {
            type: "minicolors",
            selector: "#spoilerHoverFontColor"
        }
    },
    ".quotation": {
        "color": {
            type: "minicolors",
            selector: "#quotationFontColor"
        }
    },
    ".cspoilerTitle, a.expandCollapse": {
        "color": {
            type: "minicolors",
            selector: "#collapsibleTitleFontColor"
        }
    },
    ".cspoilerTitle:hover, a.expandCollapse:hover": {
        "color": {
            type: "minicolors",
            selector: "#collapsibleTitleHoverFontColor"
        }
    },
    ".spoilerMarkupButton": {
        "background-color": {
            selector: "#bodyBackgroundColor",
            type: "minicolors"
        }
    },
    ".tooltip": {
        "color": {
            selector: "#tooltipFontColor",
            type: "minicolors"
        }
    },
    ".tooltip:hover": {
        "color": {
            selector: "#tooltipHoverFontColor",
            type: "minicolors"
        }
    },
    "ul.jqueryFileTree a": {
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors",
            important: true
        }
    },
    "ul.jqueryFileTree a:hover": {
        "background-color": {
            selector: "#dialogHoverBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#dialogHoverFontColor",
            type: "minicolors"
        }
    },
    ".newPostCount": {
        "color": {
            selector: "#newPostCountFontColor",
            type: "minicolors"
        }
    },
    ".postFileSize": {
        "color": {
            selector: "#postFileSizeFontColor",
            type: "minicolors"
        }
    },
    ".theTitle": {
        "color": {
            selector: "#pageTitleFontColor",
            type: "minicolors"
        }
    },
    ".bumpLimitReached": {
        "color": {
            selector: "#bumpLimitReachedFontColor",
            type: "minicolors"
        }
    },
    ".postLimitReached": {
        "color": {
            selector: "#postLimitReachedFontColor",
            type: "minicolors"
        }
    },
    ".postSubject": {
        "color": {
            type: "minicolors",
            selector: "#postSubjectFontColor"
        },
        "font-weight": {
            type: "select",
            selector: "#postSubjectFontWeight"
        }
    },
    ".userName": {
        "color": {
            type: "minicolors",
            selector: "#userNameFontColor"
        },
        "font-weight": {
            type: "select",
            selector: "#userNameFontWeight"
        }
    },
    ".moderName": {
        "color": {
            type: "minicolors",
            selector: "#moderNameFontColor"
        },
        "font-weight": {
            type: "select",
            selector: "#moderNameFontWeight"
        }
    },
    ".tripcode": {
        "color": {
            type: "minicolors",
            selector: "#tripcodeFontColor"
        }
    },
    ".opSign": {
        "color": {
            type: "minicolors",
            selector: "#opSignFontColor"
        }
    },
    ".postSequenceNumber": {
        "color": {
            type: "minicolors",
            selector: "#postSequenceNumberFontColor"
        }
    },
    ".hideReason": {
        "color": {
            type: "minicolors",
            selector: "#hideReasonFontColor"
        },
        "font-weight": {
            type: "select",
            selector: "#hideReasonFontWeight"
        }
    },
    ".cspoilerBody": {
        "background-color": {
            type: "minicolors",
            selector: "#collapsibleBodyBackgroundColor"
        },
        "border": [
            {
                enabledSelector: "#collapsibleBodyBorderEnabled",
                selector: "#collapsibleBodyBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#collapsibleBodyBorderEnabled",
                selector: "#collapsibleBodyBorderType",
                type: "select"
            },
            {
                enabledSelector: "#collapsibleBodyBorderEnabled",
                selector: "#collapsibleBodyBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".sectionBody, .error": {
        "background-color": {
            type: "minicolors",
            selector: "#sectionBodyBackgroundColor"
        },
        "border": [
            {
                selector: "#sectionBodyBorderWidth",
                type: "select"
            },
            {
                selector: "#sectionBodyBorderType",
                type: "select"
            },
            {
                selector: "#sectionBodyBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".vote": {
        "background-color": {
            type: "minicolors",
            selector: "#sectionBodyBackgroundColor"
        },
        "border": [
            {
                selector: "#sectionBodyBorderWidth",
                type: "select"
            },
            {
                selector: "#sectionBodyBorderType",
                type: "select"
            },
            {
                selector: "#sectionBodyBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".voteText": {
        "font-weight": {
            type: "value",
            value: "bold"
        }
    },
    ".voteCount": {
        "font-style": {
            type: "value",
            value: "italic"
        }
    },
    ".chatContactList": {
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
    ".chatContact": {
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    ".chatContact:hover": {
        "background-color": {
            selector: "#dialogHoverBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#dialogHoverFontColor",
            type: "minicolors"
        }
    },
    ".chatContact.selected": {
        "background-color": {
            selector: "#dialogActiveBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#dialogActiveFontColor",
            type: "minicolors"
        }
    },
    ".chatContactNewMessages": {
        "color": {
            type: "minicolors",
            selector: "#bannedForFontColor"
        }
    },
    ".chatTarget": {
        "background-color": {
            type: "minicolors",
            selector: "#sectionBodyBackgroundColor"
        }
    },
    ".chatHistory": {
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
    ".chatMessage": {
        "background-color": {
            type: "minicolors",
            selector: "#sectionBodyBackgroundColor"
        },
        "border": [
            {
                selector: "#sectionBodyBorderWidth",
                type: "select"
            },
            {
                selector: "#sectionBodyBorderType",
                type: "select"
            },
            {
                selector: "#sectionBodyBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".chatMessageDate": {
        "border-bottom": [
            {
                selector: "#sectionBodyBorderWidth",
                type: "select"
            },
            {
                type: "value",
                value: "dotted"
            },
            {
                selector: "#sectionBodyBorderColor",
                type: "minicolors"
            }
        ]
    },
    ".bannedFor": {
        "color": {
            type: "minicolors",
            selector: "#bannedForFontColor"
        }
    },
    ".modificationDateTime": {
        "color": {
            type: "minicolors",
            selector: "#modificationDateTimeFontColor"
        },
        "font-style": {
            type: "select",
            selector: "#modificationDateTimeFontStyle"
        }
    },
    ".referencedBy": {
        "color": {
            type: "minicolors",
            selector: "#referencedByFontColor"
        }
    },
    ".postformFile": {
        "border": [
            {
                type: "value",
                value: "1px dashed"
            },
            {
                selector: "#postFormFileBorderColor",
                type: "minicolors"
            }
        ]
    },
    ".postformFile.drag": {
        "border": [
            {
                type: "value",
                value: "1px dashed"
            },
            {
                selector: "#postFormFileDragBorderColor",
                type: "minicolors"
            }
        ],
        "background-color": {
            type: "minicolors",
            selector: "#postFormFileDragBackgroundColor"
        }
    },
    "ul.tabWidget > li": {
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        },
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    "ul.tabWidget > li > a": {
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    "ul.tabWidget > li:hover": {
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
                selector: "#dialogHoverBorderColor",
                type: "minicolors"
            }
        ],
        "background-color": {
            selector: "#dialogHoverBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#dialogHoverFontColor",
            type: "minicolors"
        }
    },
    "ul.tabWidget > li.activated": {
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
                selector: "#dialogActiveBorderColor",
                type: "minicolors"
            }
        ],
        "background-color": {
            selector: "#dialogActiveBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#dialogActiveFontColor",
            type: "minicolors"
        }
    },
    "ul.tabWidget > li.activated > a": {
        "color": {
            selector: "#dialogActiveFontColor",
            type: "minicolors"
        }
    },
    ".postFormHeader": {
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        },
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    "#postForm.floatingPostForm > .postFormHeader": {
        "border": {
            type: "value",
            value: "none"
        },
        "border-bottom": [
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
    ".toolbar.sticky": {
        "background-color": {
            selector: "#bodyBackgroundColor",
            type: "minicolors"
        },
        "border-bottom": [
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
    "input:not([type='image']), textarea": {
        "color": {
            enabledSelector: "#inputFontColorEnabled",
            selector: "#inputFontColor"
        },
        "background-color": {
            enabledSelector: "#inputBackgroundColorEnabled",
            type: "minicolors",
            selector: "#inputBackgroundColor"
        },
        "border": [
            {
                enabledSelector: "#inputBorderEnabled",
                selector: "#inputBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#inputBorderEnabled",
                selector: "#inputBorderType",
                type: "select"
            },
            {
                enabledSelector: "#inputBorderEnabled",
                selector: "#inputBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".input": {
        "color": {
            enabledSelector: "#inputClassedFontColorEnabled",
            selector: "#inputClassedFontColor"
        },
        "background-color": {
            enabledSelector: "#inputClassedBackgroundColorEnabled",
            type: "minicolors",
            selector: "#inputClassedBackgroundColor"
        },
        "border": [
            {
                enabledSelector: "#inputClassedBorderEnabled",
                selector: "#inputClassedBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#inputClassedBorderEnabled",
                selector: "#inputClassedBorderType",
                type: "select"
            },
            {
                enabledSelector: "#inputClassedBorderEnabled",
                selector: "#inputClassedBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".select": {
        "color": {
            enabledSelector: "#selectClassedFontColorEnabled",
            selector: "#selectClassedFontColor"
        },
        "background-color": {
            enabledSelector: "#selectClassedBackgroundColorEnabled",
            type: "minicolors",
            selector: "#selectClassedBackgroundColor"
        },
        "border": [
            {
                enabledSelector: "#selectClassedBorderEnabled",
                selector: "#selectClassedBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#selectClassedBorderEnabled",
                selector: "#selectClassedBorderType",
                type: "select"
            },
            {
                enabledSelector: "#selectClassedBorderEnabled",
                selector: "#selectClassedBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".selectOption": {
        "background-color": {
            enabledSelector: "#selectClassedBackgroundColorEnabled",
            type: "minicolors",
            selector: "#selectClassedBackgroundColor"
        }
    },
    ".button": {
        "color": {
            enabledSelector: "#buttonClassedFontColorEnabled",
            selector: "#buttonClassedFontColor"
        },
        "background-color": {
            enabledSelector: "#buttonClassedBackgroundColorEnabled",
            type: "minicolors",
            selector: "#buttonClassedBackgroundColor"
        },
        "border": [
            {
                enabledSelector: "#buttonClassedBorderEnabled",
                selector: "#buttonClassedBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#buttonClassedBorderEnabled",
                selector: "#buttonClassedBorderType",
                type: "select"
            },
            {
                enabledSelector: "#buttonClassedBorderEnabled",
                selector: "#buttonClassedBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".submitContainer > input": {
        "border": [
            {
                type: "value",
                value: "1px solid"
            },
            {
                type: "minicolors",
                selector: "#linkFontColor"
            }
        ]
    },
    ".popup": {
        "background-color": {
            type: "minicolors",
            selector: "#popupBackgroundColor"
        },
        "color": {
            enabledSelector: "#popupFontColor",
            type: "minicolors",
            selector: "#popupFontColor"
        },
        "border": [
            {
                enabledSelector: "#popupBorderEnabled",
                selector: "#popupBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#popupBorderEnabled",
                selector: "#popupBorderType",
                type: "select"
            },
            {
                enabledSelector: "#popupBorderEnabled",
                selector: "#popupBorderColor",
                type: "minicolors"
            }
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".warning": {
        "background-color": {
            enabledSelector: "#popupWarningBackgroundColornabled",
            type: "minicolors",
            selector: "#popupWarningBackgroundColor"
        },
        "color": {
            enabledSelector: "#popupWarningFontColorEnabled",
            type: "minicolors",
            selector: "#popupWarningFontColor"
        },
        "border": [
            {
                enabledSelector: "#popupWarningBorderEnabled",
                selector: "#popupWarningBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#popupWarningBorderEnabled",
                selector: "#popupWarningBorderType",
                type: "select"
            },
            {
                enabledSelector: "#popupWarningBorderEnabled",
                selector: "#popupWarningBorderColor",
                type: "minicolors"
            }
        ]
    },
    ".critical": {
        "background-color": {
            enabledSelector: "#popupCriticalBackgroundColornabled",
            type: "minicolors",
            selector: "#popupCriticalBackgroundColor"
        },
        "color": {
            enabledSelector: "#popupCriticalFontColorEnabled",
            type: "minicolors",
            selector: "#popupCriticalFontColor"
        },
        "border": [
            {
                enabledSelector: "#popupCriticalBorderEnabled",
                selector: "#popupCriticalBorderWidth",
                type: "select"
            },
            {
                enabledSelector: "#popupCriticalBorderEnabled",
                selector: "#popupCriticalBorderType",
                type: "select"
            },
            {
                enabledSelector: "#popupCriticalBorderEnabled",
                selector: "#popupCriticalBorderColor",
                type: "minicolors"
            }
        ]
    },
    ".favorites > div": {
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
    ".scrollAreaH60": {
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
    "#player": {
       "background-color": {
            selector: "#bodyBackgroundColor",
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    "#player.minimized": {
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
    },
    ".playerHeader": {
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        },
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    ".track": {
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        },
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    ".track:hover": {
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
                selector: "#dialogHoverBorderColor",
                type: "minicolors"
            }
        ],
        "background-color": {
            selector: "#dialogHoverBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#dialogHoverFontColor",
            type: "minicolors"
        }
    },
    ".track.selected": {
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
                selector: "#dialogActiveBorderColor",
                type: "minicolors"
            }
        ],
        "background-color": {
            selector: "#dialogActiveBackgroundColor",
            type: "minicolors"
        },
        "font-weight": {
            selector: "#bodyFontWeight",
            type: "select"
        },
        "color": {
            selector: "#dialogActiveFontColor",
            type: "minicolors"
        }
    },
    ".track.selected > .trackInfo": {
        "font-weight": {
            type: "value",
            value: "bold"
        },
    },
    ".sidebarGroup": {
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".sidebarGroup ~ .sidebarGroup": {
        "margin-top": {
            type: "value",
            value: "4px"
        }
    },
    ".sidebarGroupTitle": {
        "font-weight": {
            type: "value",
            value: "bold"
        },
        "padding": {
            type: "value",
            value: "2px 4px 2px 4px"
        },
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
        "border-bottom": [
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        }
    },
    ".sidebarGroupBody": {
        "padding": {
            type: "value",
            value: "4px"
        }
    },
    ".searchResultHighlighted": {
        "background-color": {
            selector: "#searchResultHighlightedBackgroundColor",
            type: "minicolors"
        }
    },
    ".bordered": {
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
    ".borderRadius, .menu, .movablePlayer, .movablePlayerControls, .ui-corner-all, .ui-corner-top, .ui-corner-bottom, .ui-corner-left, .ui-corner-right, .ui-corner-tl, .ui-corner-tr, .ui-corner-bl, .ui-corner-br": {
        enabledSelector: "#borderRadiusEnabled",
        "border-radius": {
            selector: "#borderRadius",
            type: "number"
        }
    }
};

lord.jqueryUIStyleSelectors = {
    ".ui-widget": {
        "font-family": {
            enabledSelector: "#bodyFontFamilyEnabled",
            selector: "#bodyFontFamily",
            type: "text"
        },
        "font-size": {
            type: "value",
            value: "1em"
        }
    },
    ".ui-widget-content": {
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
        ],
        "background-color": {
            selector: "#bodyBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    ".ui-widget-header": {
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
        ],
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            selector: "#borderRadius",
            type: "number"
        },
        "background-color": {
            selector: "#postBackgroundColor",
            type: "minicolors"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        },
        "font-weight": {
            type: "value",
            value: "bold"
        }
    },
    ".ui-widget-content a, .ui-widget-header a": {
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    ".ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default": {
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
        ],
        "background-color": {
            selector: "#bodyBackgroundColor",
            type: "minicolors"
        },
        "font-weight": {
            selector: "#bodyFontWeight",
            type: "select"
        },
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        }
    },
    ".ui-state-default a, .ui-state-default a:link, .ui-state-default a:visited": {
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        },
        "text-decoration": {
            type: "value",
            value: "none"
        }
    },
    ".ui-state-hover, .ui-widget-content .ui-state-hover, .ui-widget-header .ui-state-hover, .ui-state-focus, .ui-widget-content .ui-state-focus, .ui-widget-header .ui-state-focus": {
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
                selector: "#dialogHoverBorderColor",
                type: "minicolors"
            }
        ],
        "background-color": {
            selector: "#dialogHoverBackgroundColor",
            type: "minicolors"
        },
        "font-weight": {
            selector: "#bodyFontWeight",
            type: "select"
        },
        "color": {
            selector: "#dialogHoverFontColor",
            type: "minicolors"
        }
    },
    ".ui-menu-item.ui-state-hover, .ui-menu-item.ui-state-focus": {
        "padding": {
            type: "value",
            value: "2px calc(1em - 1px) 2px calc(.4em - 1px)"
        }
    },
    ".ui-state-hover a, .ui-state-hover a:hover, .ui-state-hover a:link, .ui-state-hover a:visited, .ui-state-focus a, .ui-state-focus a:hover, .ui-state-focus a:link, .ui-state-focus a:visited": {
        "color": {
            selector: "#bodyFontColor",
            type: "minicolors"
        },
        "text-decoration": {
            type: "value",
            value: "none"
        }
    },
    ".ui-state-active, .ui-widget-content .ui-state-active, .ui-widget-header .ui-state-active": {
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
                selector: "#dialogActiveBorderColor",
                type: "minicolors"
            }
        ],
        "background-color": {
            selector: "#dialogActiveBackgroundColor",
            type: "minicolors"
        },
        "font-weight": {
            selector: "#bodyFontWeight",
            type: "select"
        },
        "color": {
            selector: "#dialogActiveFontColor",
            type: "minicolors"
        }
    },
    ".ui-menu-item.ui-state-active, .ui-menu-item.ui-state-active": {
        "padding": {
            type: "value",
            value: "2px calc(1em - 1px) 2px calc(.4em - 1px)"
        }
    },
    ".ui-state-active a, .ui-state-active a:link, .ui-state-active a:visited": {
        "color": {
            selector: "#dialogActiveFontColor",
            type: "minicolors"
        },
        "text-decoration": {
            type: "value",
            value: "none"
        }
    },
    ".ui-widget input, .ui-widget select, .ui-widget textarea, .ui-widget button": {
        "font-family": {
            enabledSelector: "#bodyFontFamilyEnabled",
            selector: "#bodyFontFamily",
            type: "text"
        },
        "font-size": {
            type: "value",
            value: "1em"
        }
    },
    ".ui-tooltip": {
        "padding": {
            type: "value",
            value: "2px"
        },
        "position": {
            type: "value",
            value: "absolute"
        },
        "z-index": {
            type: "value",
            value: "9999"
        },
        "max-width": {
            type: "value",
            value: "300px"
        },
        "-webkit-box-shadow": {
            type: "value",
            value: "0 0 5px #AAAAAA"
        },
        "box-shadow": {
            type: "value",
            value: "0 0 5px #AAAAAA"
        },
        "background-color": {
            selector: "#tooltipBackgroundColor",
            type: "minicolors"
        },
        "border": [
            {
                type: "value",
                value: "2px solid"
            },
            {
                selector: "#tooltipBorderColor",
                type: "minicolors"
            },
            {
                type: "value",
                value: "!important"
            }
        ]
    },
    ".ui-slider, .ui-slider-handle": {
        "border-radius": {
            enabledSelector: "#borderRadiusEnabled",
            type: "value",
            value: "0px",
            important: true
        },
        "border": [
            {
                enabledSelector: "#playerSliderBorderEnabled",
                type: "value",
                value: "1px solid"
            },
            {
                enabledSelector: "#playerSliderBorderEnabled",
                selector: "#playerSliderBorderColor",
                type: "minicolors"
            },
            {
                enabledSelector: "#playerSliderBorderEnabled",
                type: "value",
                value: "!important"
            }
        ]
    },
    ".ui-tooltip-content": {
        "font-family": {
            enabledSelector: "#bodyFontFamilyEnabled",
            selector: "#bodyFontFamily",
            type: "text"
        },
        "background-color": {
            selector: "#tooltipBackgroundColor",
            type: "minicolors"
        }
    },
    ".ui-tooltip-content::after": {
        "border-color": [
            {
                selector: "#tooltipBorderColor",
                type: "minicolors"
            },
            {
                type: "value",
                value: "transparent"
            }
        ]
    }
};

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
        return el.minicolors("value").toUpperCase().replace("RGBA", "rgba").replace("RGB", "rgb");
    case "number":
        return +el[0].value;
    case "text":
    case "select":
    default:
        return el[0].value;
    }
};

lord.createTheme = function(selectors) {
    var s = "";
    lord.each(selectors, function(attributes, selector) {
        if (attributes.enabledSelector) {
            var el = $(attributes.enabledSelector);
            if (!el[0] || !el[0].checked)
                return;
        }
        if (attributes.disabledSelector) {
            var el = $(attributes.disabled);
            if (el[0] && el[0].checked)
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
                if (item.disabledSelector) {
                    var el = $(item.disabledSelector);
                    if (el[0] && el[0].checked)
                        return;
                }
                var val = lord.getAttributeValue(item);
                sss += val;
                if (!item.nopx && item.type != "select" && !isNaN(+val))
                    sss += "px";
                if (i < data.length - 1)
                    sss += " ";
            });
            if (!sss)
                return;
            ss += "    " + attribute + ": " + sss;
            if (data.important || (data.length && data[data.length - 1].important))
                ss += " !important";
            ss += ";\n";
        });
        if (!ss)
            return;
        s += selector + " {\n" + ss + "}\n\n";
    });
    return s.replace(/\n\n$/, "");
};

lord.styleChanged = function() {
    if ((lord.styleModifiedManually || lord.jqueryUIStyleModifiedManually)
        && !confirm("You changed the style manually. Overwrite the changes?")) {
        return;
    }
    lord.styleModifiedManually = false;
    lord.jqueryUIStyleModifiedManually = false;
    lord.styleModifiedProgrammatically = true;
    lord.jqueryUIStyleModifiedProgrammatically = true;
    lord.cssView.setValue(lord.createTheme(lord.styleSelectors));
    var baseCSS = $("#jqueryUIBaseCSS")[0].innerHTML;
    lord.jqueryUICSSView.setValue(baseCSS + lord.createTheme(lord.jqueryUIStyleSelectors));
};

lord.previewTheme = function() {
    var style = lord.node("style");
    style.id = "themeStylesheet";
    style.type = "text/css";
    var css = lord.jqueryUICSSView.getValue() + "\n\n" + lord.cssView.getValue();
    if (style.styleSheet)
        style.styleSheet.cssText = css;
    else
        style.appendChild(lord.node("text", css));
    lord.previewWindow.document.head.replaceChild(style, lord.previewWindow.document.getElementById("themeStylesheet"));
};

lord.showHideCSS = function() {
    var show = !!$("#cssView")[0].style.display;
    $("#cssView")[0].style.display = show ? "" : "none";
    $("#cssView").parent().find("a[name='css']").empty().text(show ? "Hide CSS" : "Show CSS");
};

lord.showHideJqueryUICSS = function() {
    var show = !!$("#jqueryUICSSView")[0].style.display;
    $("#jqueryUICSSView")[0].style.display = show ? "" : "none";
    $("#jqueryUICSSView").parent().find("a[name='jqueryuicss']").empty().text(show ? "Hide jQuery UI CSS" : "Show jQuery UI CSS");
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
        var o = {};
        try {
            o = JSON.parse(text);
        } catch (err) {
            return Promise.reject(err);
        }
        for (var id in o) {
            if (!o.hasOwnProperty(id))
                continue;
            var inp = $("#" + id)[0];
            if (!inp)
                continue;
            switch ((inp.tagName || "").toUpperCase()) {
            case "INPUT":
                if ($(inp).hasClass("minicolors-input"))
                    $(inp).minicolors("value", o[id]);
                else if (["checkbox", "radio"].indexOf(inp.type.toLowerCase()) >= 0)
                    inp.checked = !!o[id];
                else
                    inp.value = o[id];
                break;
            case "SELECT":
                inp.selectedIndex = o[id];
                break;
            default:
                break;
            }
        }
        lord.styleChanged();
    }).catch(function(err) {
        alert(err);
    });
};

lord.export = function() {
    var name = $("#styleName")[0].value.toLowerCase().replace(/\s\//gi, "-");
    if (!name)
        return alert("No name specified");
    var o = {};
    console.log($("#options"));
    $("#options").find("input").each(function(_, inp) {
        switch (inp.type.toLowerCase()) {
        case "checkbox":
        case "radio":
            o[inp.id] = !!inp.checked;
            break;
        default:
            o[inp.id] = inp.value;
            break;
        }
    });
    $("#options").find("select").each(function(_, sel) {
        o[sel.id] = sel.selectedIndex;
    });
    var blob = new Blob([JSON.stringify(o, null, 4)], {type: "text/plain;charset=utf-8"});
    saveAs(blob, name + "-option.json");
};

lord.roll = function() {
    var name = $("#styleName")[0].value.toLowerCase().replace(/\s\//gi, "-");
    if (!name)
        return alert("No name specified");
    var title = $("#styleTitle")[0].value;
    if (!title)
        return alert("No title specified");
    var text = "/*" + title + "*/\n\n/*jQuery UI*/\n\n" + lord.jqueryUICSSView.getValue() + "\n\n";
    text += "/*The style*/\n\n" + lord.cssView.getValue();
    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    saveAs(blob, name + ".css");
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
    $(".sectionBody input, .sectionBody select, .sectionHeader input").on("change", function() {
        lord.styleChanged();
    });
    lord.cssView = CodeMirror($("#cssView")[0], {
        mode: "css",
        indentUnit: 4,
        lineNumbers: true,
        value: ""
    });
    lord.cssView.on("change", function() {
        lord.previewTheme();
        if (!lord.styleModifiedProgrammatically)
            lord.styleModifiedManually = true;
        lord.styleModifiedProgrammatically = false;
    });
    lord.jqueryUICSSView = CodeMirror($("#jqueryUICSSView")[0], {
        mode: "css",
        indentUnit: 4,
        lineNumbers: true,
        value: ""
    });
    lord.jqueryUICSSView.on("change", function() {
        lord.previewTheme();
        if (!lord.jqueryUIStyleModifiedProgrammatically)
            lord.jqueryUIStyleModifiedManually = true;
        lord.jqueryUIStyleModifiedProgrammatically = false;
    });
    lord.previewWindow = $("#preview > iframe")[0].contentWindow;
    lord.styleChanged();
}, false);
