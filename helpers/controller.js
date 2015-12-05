var Crypto = require("crypto");
var dot = require("dot");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Highlight = require("highlight.js");
var merge = require("merge");
var moment = require("moment");
var Path = require("path");
var random = require("random-js")();
var Util = require("util");

var config = require("./config");

var partials = {};
var templates = {};
var publicPartials;
var publicTemplates;
var langNames = require("../misc/lang-names.json");
var ipBans = require("../misc/bans.json");

var controller;

var customContent = function(req, name) {
    return Tools.localeBasedFileName(__dirname + "/../views/custom/" + name + "/content.jst").then(function(fileName) {
        if (!fileName)
            return Promise.resolve(null);
        return controller(req, "custom/" + name + "/" + Path.basename(fileName, ".jst"));
    });
};

var formattedDate = function(date, req) {
    var offset = ("local" == req.settings.time) ? req.settings.timeZoneOffset : config("site.timeOffset", 0);
    var locale = config("site.locale", "en");
    var format = config("site.dateFormat", "MM/DD/YYYY HH:mm:ss");
    return moment(date).utcOffset(offset).locale(locale).format(format);
};

controller = function(req, templateName, modelData) {
    var baseModelData = merge.recursive(controller.baseModel(req), controller.settingsModel(req));
    baseModelData = merge.recursive(baseModelData, controller.translationsModel());
    baseModelData = merge.recursive(baseModelData, controller.boardsModel());
    baseModelData.path = req.path;
    if (baseModelData.user.loggedIn) {
        if (Database.compareRegisteredUserLevels(baseModelData.user.level, "ADMIN") >= 0) {
            baseModelData.loginMessageText = Tools.translate("logged in as administrator", "loginMessageText");
        } else if (Database.compareRegisteredUserLevels(baseModelData.user.level, "MODER") >= 0) {
            baseModelData.loginMessageText = Tools.translate("logged in as moderator", "loginMessageText");
        } else if (Database.compareRegisteredUserLevels(baseModelData.user.level, "USER") >= 0) {
            baseModelData.loginMessageText = Tools.translate("logged in as user", "loginMessageText");
        } else {
            baseModelData.loginMessageText = Tools.translate("not registered", "loginMessageText");
        }
    }
    baseModelData.compareRatings = Database.compareRatings;
    baseModelData.compareRegisteredUserLevels = Database.compareRegisteredUserLevels;
    baseModelData.formattedDate = formattedDate;
    baseModelData.publicPartials = publicPartials;
    baseModelData.publicTemplates = publicTemplates;
    baseModelData.models = {
        base: JSON.stringify(controller.baseModel(req)),
        boards: JSON.stringify(controller.boardsModel()),
        tr: JSON.stringify(controller.translationsModel()),
        partials: JSON.stringify(publicPartials.map(function(partial) {
            return partial.name
        })),
        templates: JSON.stringify(publicTemplates.map(function(partial) {
            return partial.name
        }))
    };
    if (!modelData)
        modelData = {};
    var template = templates[templateName];
    var p;
    if (templateName.substr(0, 13) == "custom/footer" || templateName.substr(0, 13) == "custom/header"
        || templateName.substr(0, 11) == "custom/home" || templateName.substr(0, 10) == "custom/faq") {
        if (template) {
            p = Promise.resolve();
        } else {
            p = FS.read(__dirname + "/../views/" + templateName + ".jst").then(function(data) {
                template = dot.template(data, {
                    evaluate: /\{\{([\s\S]+?)\}\}/g,
                    interpolate: /\{\{=([\s\S]+?)\}\}/g,
                    encode: /\{\{!([\s\S]+?)\}\}/g,
                    use: /\{\{#([\s\S]+?)\}\}/g,
                    define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
                    conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
                    iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
                    varname: 'it',
                    strip: false,
                    append: true,
                    selfcontained: false
                }, partials);
                templates[templateName] = template;
                return Promise.resolve();
            });
        }
    } else {
        if (!template)
            return Promise.reject("Invalid template");
        p = customContent(req, "header").then(function(content) {
            modelData.customHeader = content;
            return customContent(req, "footer");
        }).then(function(content) {
            modelData.customFooter = content;
            return Promise.resolve();
        });
    }
    return p.then(function() {
        modelData = merge.recursive(baseModelData, modelData);
        modelData.req = req;
        return Promise.resolve(template(modelData));
    });
};

controller.customContent = customContent;

controller.sync = function(req, templateName, modelData) {
    var baseModelData = merge.recursive(controller.baseModel(req), controller.settingsModel(req));
    baseModelData = merge.recursive(baseModelData, controller.translationsModel());
    baseModelData = merge.recursive(baseModelData, controller.boardsModel());
    baseModelData.path = req ? req.path : undefined;
    if (baseModelData.user.loggedIn) {
        if (Database.compareRegisteredUserLevels(baseModelData.user.level, "ADMIN") >= 0) {
            baseModelData.loginMessageText = Tools.translate("logged in as administrator", "loginMessageText");
        } else if (Database.compareRegisteredUserLevels(baseModelData.user.level, "MODER") >= 0) {
            baseModelData.loginMessageText = Tools.translate("logged in as moderator", "loginMessageText");
        } else if (Database.compareRegisteredUserLevels(baseModelData.user.level, "USER") >= 0) {
            baseModelData.loginMessageText = Tools.translate("logged in as user", "loginMessageText");
        } else {
            baseModelData.loginMessageText = Tools.translate("not registered", "loginMessageText");
        }
    }
    baseModelData.compareRatings = Database.compareRatings;
    baseModelData.compareRegisteredUserLevels = Database.compareRegisteredUserLevels;
    baseModelData.formattedDate = formattedDate;
    if (!modelData)
        modelData = {};
    var template = templates[templateName];
    if (!template)
        return null;
    modelData = merge.recursive(baseModelData, modelData);
    modelData.req = req;
    return template(modelData);
};

controller.error = function(req, res, error, ajax) {
    if (!ajax && Util.isNumber(error) && 404 == error)
        return controller.notFound(req, res);
    var f = function(error) {
        var model = {};
        model.title = Tools.translate("Error", "pageTitle");
        if (Util.isError(error)) {
            if (Tools.contains(process.argv.slice(2), "--dev-mode")) {
                console.log(error);
                console.log(error.stack);
            }
            model.errorMessage = Tools.translate("Internal error", "errorMessage");
            model.errorDescription = error.message;
        } else if (Util.isObject(error) && error.error) {
            if (Tools.contains(process.argv.slice(2), "--dev-mode"))
                console.log(error);
            model.errorMessage = error.description ? error.error : Tools.translate("Error", "errorMessage");
            model.errorDescription = error.description || error.error;
        } else {
            if (Tools.contains(process.argv.slice(2), "--dev-mode"))
                console.log(error);
            model.errorMessage = Tools.translate("Error", "errorMessage");
            model.errorDescription = (error && Util.isString(error)) ? error : "";
        }
        return model;
    };
    var g = function(error) {
        try {
            res.send(f(error));
        } catch (err) {
            return Promise.reject(err);
        }
        return Promise.resolve();
    };
    var h = function(error) {
        try {
            res.send(error);
        } catch (err) {
            return Promise.reject(err);
        }
        return Promise.resolve();
    };
    if (Util.isObject(error) && error.ban) {
        var model = {};
        model.title = Tools.translate("Ban", "pageTitle");
        model.ban = error.ban;
        return ajax ? h(error) : controller(req, "ban", model).then(function(data) {
            res.send(data);
        }).catch(h);
    } else {
        return ajax ? g(error) : controller(req, "error", f(error)).then(function(data) {
            res.send(data);
        }).catch(g);
    }
};

controller.notFound = function(req, res) {
    var model = {};
    model.title = Tools.translate("Error 404", "pageTitle");
    model.notFoundMessage = Tools.translate("Page or file not found", "notFoundMessage");
    var path = __dirname + "/../public/img/404";
    return FS.list(path).then(function(fileNames) {
        var promises = fileNames.map(function(fileName) {
            return FS.stat(path + "/" + fileName).then(function(stats) {
                return {
                    fileName: fileName,
                    stats: stats
                };
            });
        });
        return Promise.all(promises);
    }).then(function(results) {
        var fileNames = results.filter(function(result) {
            return result.stats.isFile() && result.fileName != ".placeholder";
        }).map(function(result) {
            return result.fileName;
        });
        if (fileNames.length > 0)
            model.imageFileName = fileNames[random.integer(0, fileNames.length - 1)];
        return controller(req, "notFound", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        controller.error(req, res, err);
    });
};

controller.checkBan = function(req, res, boardName, write) {
    var ban = ipBans[req.ip];
    if (ban && (write || "NO_ACCESS" == ban.level))
        return Promise.reject({ ban: ban });
    return Database.bannedUser(req.ip).then(function(user) {
        if (!user || !user.bans || user.bans.length < 1)
            return Promise.resolve();
        var ban = user.bans[boardName];
        if (!ban)
            return Promise.resolve();
        if (write)
            return Promise.reject({ ban: ban });
        return ("NO_ACCESS" == ban.level) ? Promise.reject({ ban: ban }) : Promise.resolve();
    });
};

controller.baseModel = function(req) {
    return {
        site: {
            protocol: config("site.protocol", "http"),
            domain: config("site.domain", "localhost:8080"),
            pathPrefix: config("site.pathPrefix", ""),
            locale: config("site.locale", "en"),
            dateFormat: config("site.dateFormat", "MM/DD/YYYY hh:mm:ss"),
            timeOffset: config("site.timeOffset", 0),
            vkontakte: {
                integrationEnabled: !!config("site.vkontakte.integrationEnabled", false),
                appId: config("site.vkontakte.appId", "")
            },
            twitter: {
                integrationEnabled: !!config("site.twitter.integrationEnabled", true)
            }
        },
        user: {
            ip: (req ? req.ip : undefined),
            hashpass: (req ? req.hashpass : undefined),
            level: (req ? req.level : undefined),
            loggedIn: (req ? !!req.hashpass : undefined),
            vkAuth: (req ? req.vkAuth : undefined)
        },
        styles: Tools.styles(),
        codeStyles: Tools.codeStyles(),
        deviceType: ((req && req.device.type == "desktop") ? "desktop" : "mobile"),
        availableCodeLangs: Highlight.listLanguages().map(function(lang) {
            return {
                id: lang,
                name: (langNames.hasOwnProperty(lang) ? langNames[lang] : lang)
            };
        }),
        markupModes: [
            {
                name: "NONE",
                title: Tools.translate("No markup", "markupMode")
            }, {
                name: markup.MarkupModes.ExtendedWakabaMark,
                title: Tools.translate("Extended WakabaMark only", "markupMode")
            }, {
                name: markup.MarkupModes.BBCode,
                title: Tools.translate("bbCode only", "markupMode")
            }, {
                name: (markup.MarkupModes.ExtendedWakabaMark + "," + markup.MarkupModes.BBCode),
                title: Tools.translate("Extended WakabaMark and bbCode", "markupMode")
            },
        ],
        supportedCaptchaEngines: Captcha.captchaIds().map(function(id) {
            var captcha = Captcha.captcha(id);
            return {
                id: captcha.id,
                title: captcha.title,
                publicKey: captcha.publicKey
            };
        })
    };
};

controller.boardsModel = function() {
    var boards = Board.boardNames().map(function(boardName) {
        var board = Board.board(boardName);
        var model = {
            name: board.name,
            title: board.title,
            defaultUserName: board.defaultUserName,
            showWhois: board.showWhois,
            hidden: board.hidden,
            postingEnabled: board.postingEnabled,
            captchaEnabled: board.captchaEnabled,
            maxEmailLength: board.maxEmailLength,
            maxNameLength: board.maxNameLength,
            maxSubjectLength: board.maxSubjectLength,
            maxTextLength: board.maxTextLength,
            maxPasswordLength: board.maxPasswordLength,
            maxFileCount: board.maxFileCount,
            maxFileSize: board.maxFileSize,
            maxLastPosts: board.maxLastPosts,
            markupElements: board.markupElements,
            supportedFileTypes: board.supportedFileTypes,
            supportedCaptchaEngines: board.supportedCaptchaEngines,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit
        };
        board.customBoardInfoFields().forEach(function(field) {
            model[field] = board[field];
        });
        return model;
    });
    return { boards: boards };
};

controller.boardModel = function(board) {
    if (Util.isString(board))
        board = Board.board(board);
    if (!board)
        return null;
    var model = {
        board: {
            name: board.name,
            title: board.title,
            defaultUserName: board.defaultUserName,
            showWhois: board.showWhois,
            hidden: board.hidden,
            postingEnabled: board.postingEnabled,
            captchaEnabled: board.captchaEnabled,
            maxEmailLength: board.maxEmailLength,
            maxNameLength: board.maxNameLength,
            maxSubjectLength: board.maxSubjectLength,
            maxTextLength: board.maxTextLength,
            maxPasswordLength: board.maxPasswordLength,
            maxFileCount: board.maxFileCount,
            maxFileSize: board.maxFileSize,
            maxLastPosts: board.maxLastPosts,
            markupElements: board.markupElements,
            supportedFileTypes: board.supportedFileTypes,
            supportedCaptchaEngines: board.supportedCaptchaEngines,
            bumpLimit: board.bumpLimit,
            postLimit: board.postLimit
        }
    };
    board.customBoardInfoFields().forEach(function(field) {
        model.board[field] = board[field];
    });
    return model;
};

controller.settingsModel = function(req) {
    return { settings: (req ? req.settings : {}) };
};

controller.translationsModel = function() {
    var tr = {};
    var translate = function(sourceText, disambiguation) {
        tr[disambiguation] = Tools.translate(sourceText, disambiguation);
    };
    translate("Playlist", "toPlaylistPageText");
    translate("Markup", "toMarkupPageText");
    translate("Home", "toHomePageText");
    translate("Framed version", "framedVersionText");
    translate("Version without frame", "normalVersionText");
    translate("F.A.Q.", "toFaqPageText");
    translate("User management", "toManagePageText");
    translate("Hide by image hash", "hideByImageText");
    translate("Answer", "toThread");
    translate("Answers:", "referencedByText");
    translate("Fixed", "fixedText");
    translate("The thread is closed", "closedText");
    translate("Add to drafts", "addToDraftsText");
    translate("This user is registered", "registeredText");
    translate("Post limit reached", "postLimitReachedText");
    translate("Bump limit reached", "bumpLimitReachedText");
    translate("Quick reply", "quickReplyText");
    translate("Post actions", "postActionsText");
    translate("Edit post", "editPostText");
    translate("Fix thread", "fixThreadText");
    translate("Unfix thread", "unfixThreadText");
    translate("Close thread", "closeThreadText");
    translate("Open thread", "openThreadText");
    translate("Move thread", "moveThreadText");
    translate("Show user IP", "showUserIpText");
    translate("Ban user", "banUserText");
    translate("Download all thread files as a .zip archive", "downloadThreadText");
    translate("Complain", "complainText");
    translate("Add thread to favorites", "addThreadToFavoritesText");
    translate("Remove thread from favorites", "removeThreadFromFavoritesText");
    translate("Delete thread", "deleteThreadText");
    translate("Delete post", "deletePostText");
    translate("Hide/show", "showHidePostText");
    translate("Last modified:", "modificationDateTimeText");
    translate("User was banned for this post", "bannedForText");
    translate("Delete file", "deleteFileText");
    translate("Find source with Google", "findSourceWithGoogleText");
    translate("Find source with Yandex", "findSourceWithYandexText");
    translate("Find source with TinEye", "findSourceWithTineyeText");
    translate("Find source with SauceNAO", "findSourceWithSaucenaoText");
    translate("Find source with Iqdb", "findSourceWithIqdbText");
    translate("Edit audio file tags", "editAudioTagsText");
    translate("Add to playlist", "addToPlaylistText");
    translate("Answer in this thread", "answerInThreadText");
    translate("Create thread", "createThreadText");
    translate("Borad rules", "boardRulesLinkText");
    translate("Threads catalog", "boardCatalogLinkText");
    translate("RSS feed", "boardRssLinkText");
    translate("Posting is disabled at this board", "postingDisabledBoardText");
    translate("Posting is disabled in this thread", "postingDisabledThreadText");
    translate("Previous page", "toPreviousPageText");
    translate("Next page", "toNextPageText");
    translate("Posting speed:", "postingSpeedText");
    translate("Posts omitted:", "omittedPostsText");
    translate("files omitted:", "omittedFilesText");
    translate("Scroll to the top", "toTopText");
    translate("Scroll to the bottom", "toBottomText");
    translate("Search: possible +required -excluded", "searchInputPlaceholder");
    translate("All boards", "allBoardsText");
    translate("Search", "searchButtonText");
    translate("Settings", "settingsButtonText");
    translate("Favorites", "showFavoritesText");
    translate("Mum is watching me!", "mumWatchingText");
    translate("Log out", "logoutText");
    translate("Log in", "loginText");
    translate("Password/hashpass", "loginPlaceholderText");
    translate("Show password", "showPasswordText");
    translate("Previous page/file", "hotkeyPreviousPageImageLabelText");
    translate("Next page/file", "hotkeyNextPageImageLabelText");
    translate("Previous thread (on board)/post (in thread)", "hotkeyPreviousThreadPostLabelText");
    translate("Next thread (on board)/post (in thread)", "hotkeyNextThreadPostLabelText");
    translate("Previous post (in thread/on board)", "hotkeyPreviousPostLabelText");
    translate("Next post (inthread/on board)", "hotkeyNextPostLabelText");
    translate("Hide post/thread", "hotkeyHidePostLabelText");
    translate("Go to thread", "hotkeyGoToThreadLabelText");
    translate("Expand thread", "hotkeyExpandThreadLabelText");
    translate("Expand post file", "hotkeyExpandImageLabelText");
    translate("Quick reply", "hotkeyQuickReplyLabelText");
    translate("Submit reply", "hotkeySubmitReplyLabelText");
    translate("Show favorite threads", "hotkeyShowFavoritesLabelText");
    translate("Show settings", "hotkeyShowSettingsLabelText");
    translate("Update thread (in thread only)", "hotkeyUpdateThreadLabelText");
    translate("Bold text", "hotkeyMarkupBoldLabelText");
    translate("Italics", "hotkeyMarkupItalicsLabelText");
    translate("Striked out text", "hotkeyMarkupStrikedOutLabelText");
    translate("Underlined text", "hotkeyMarkupUnderlinedLabelText");
    translate("Spoiler", "hotkeyMarkupSpoilerLabelText");
    translate("Quote selected text", "hotkeyMarkupQuotationLabelText");
    translate("Code block", "hotkeyMarkupCodeLabelText");
    translate("General settings", "generalSettingsLegendText");
    translate("Style:", "styleLabelText");
    translate("Code style:", "codeStyleLabelText");
    translate("Shrink posts", "postShrinkingLabelText");
    translate("Sticky toolbar", "stickyToolbarLabelText");
    translate("Time:", "timeLabelText");
    translate("Server", "timeServerText");
    translate("Local", "timeLocalText");
    translate("Offset:", "timeZoneOffsetLabelText");
    translate("Captcha:", "captchaLabelText");
    translate("Maximum rating:", "maxAllowedRatingLabelText");
    translate("Hide postform rules", "hidePostformRulesLabelText");
    translate("Minimalistic post form", "minimalisticPostformLabelText");
    translate("Hide boards:", "hiddenBoardsLabelText");
    translate("This option may be ignored on some boards", "captchaLabelWarningText");
    translate("Script settings", "scriptSettingsLegendText");
    translate("Posts and threads", "postsTabText");
    translate("Files", "filesTabText");
    translate("Postform and posting", "postformTabText");
    translate("Hiding", "hidingTabText");
    translate("Other", "otherTabText");
    translate("Auto update threads by default", "autoUpdateThreadsByDefaultLabelText");
    translate("Auto update interval (sec):", "autoUpdateIntervalLabelText");
    translate("Show desktop notifications", "showAutoUpdateDesktopNotificationsLabelText");
    translate("Mark OP post links", "signOpPostLinksLabelText");
    translate("Mark own post links", "signOwnPostLinksLabelText");
    translate("Show file leaf buttons", "showLeafButtonsLabelText");
    translate("Leaf through images only", "leafThroughImagesOnlyLabelText");
    translate("Image zoom sensitivity:", "imageZoomSensitivityLabelText");
    translate("Default volume:", "defaultAudioVideoVolumeLabelText");
    translate("Remember", "rememberAudioVideoVolumeLabelText");
    translate("Play media immediately", "playAudioVideoImmediatelyLabelText");
    translate("Loop media", "loopAudioVideoLabelText");
    translate("Quick reply outside thread:", "quickReplyActionLabelText");
    translate("Redirects to thread", "quickReplyActionGotoThreadText");
    translate("Appends a new post", "quickReplyActionAppendPostText");
    translate("Move to post after replying in thread", "moveToPostOnReplyInThreadLabelText");
    translate("Check if attached file exists on server", "checkFileExistenceLabelText");
    translate("Show previews when attaching files", "showAttachedFilePreviewLabelText");
    translate("Add thread to favorites on reply", "addToFavoritesOnReplyLabelText");
    translate("Hide postform markup", "hidePostformMarkupLabelText");
    translate("Strip EXIF from JPEG files", "stripExifFromJpegLabelText");
    translate("Hide tripcodes", "hideTripcodesLabelText");
    translate("Hide user names", "hideUserNamesLabelText");
    translate("Strike out links to hidden posts", "strikeOutHiddenPostLinksLabelText");
    translate("Spells (command-based post hiding)", "spellsLabelText");
    translate("Edit spells", "editSpellsText");
    translate("Show hidden post list", "showHiddenPostListText");
    translate("Maximum simultaneous AJAX requests:", "maxSimultaneousAjaxLabelText");
    translate("New post count near board names", "showNewPostsLabelText");
    translate("Hotkeys enabled", "hotkeysLabelText");
    translate("User CSS enabled", "userCssLabelText");
    translate("User JavaScript enabled", "userJavaScriptLabelText");
    translate("Edit", "editHotkeysText");
    translate("Edit", "editUserCssText");
    translate("Edit", "editUserJavaScriptText");
    translate("Cancel", "cancelButtonText");
    translate("Confirm", "confirmButtonText");
    translate("Show post form", "showPostFormText");
    translate("Hide post form", "hidePostFormText");
    translate("E-mail", "postFormPlaceholderEmail");
    translate("Submit", "postFormButtonSubmit");
    translate("E-mail:", "postFormLabelEmail");
    translate("Name", "postFormPlaceholderName");
    translate("Name:", "postFormLabelName");
    translate("Subject", "postFormPlaceholderSubject");
    translate("Subject:", "postFormLabelSubject");
    translate("Comment. Max length:", "postFormTextPlaceholder");
    translate("Post:", "postFormLabelText");
    translate("Bold text", "markupBold");
    translate("Italics", "markupItalics");
    translate("Striked out text", "markupStrikedOut");
    translate("Underlined text", "markupUnderlined");
    translate("Spoiler", "markupSpoiler");
    translate("Quote selected text", "markupQuotation");
    translate("Code block syntax", "markupCodeLang");
    translate("Code block", "markupCode");
    translate("Subscript", "markupSubscript");
    translate("Superscript", "markupSuperscript");
    translate("URL (external link)", "markupUrl");
    translate("Markup mode:", "postFormLabelMarkupMode");
    translate("Options:", "postFormLabelOptions");
    translate("Raw HTML", "postFormLabelRaw");
    translate("Sign as OP", "postFormLabelSignAsOp");
    translate("Enable tripcode", "postFormLabelTripcode");
    translate("File(s):", "postFormInputFile");
    translate("Select file", "selectFileText");
    translate("Remove this file", "removeFileText");
    translate("Rating:", "ratingLabelText");
    translate("Specify file URL", "attachFileByLinkText");
    translate("Password", "postFormPlaceholderPassword");
    translate("Password:", "postFormLabelPassword");
    translate("Captcha:", "postFormLabelCaptcha");
    translate("You don't have to enter captcha", "noCaptchaText");
    translate("Posts left:", "captchaQuotaText");
    translate("Show rules", "showPostformRulesText");
    translate("Hide rules", "hidePostformRulesText");
    translate("\"Log in\", you say? On an imageboard? I am out!<br />"
        + "Please, wait a sec. The login systyem does NOT store any data on the server. "
        + "It only stores a cookie on your PC to allow post editing, deleting, etc. without "
        + "entering password every time, and nothing else.<br />"
        + "Well, actually, the admin may register someone manually (if he is a fag), "
        + "but there is no way to register through the web.", "loginSystemDescriptionText");
    translate("When logging in with Vkontakte, you may omit the login, "
        + "but to be logged in with the same login on each browser, you have to specify it.<br />"
        + "When logged in with Vkontakte, you are able to attach your VK audio.<br />"
        + "This does not affect your anonymity in any way.", "loginSystemVkontakteDescriptionText");
    translate("SFW - safe for work (no socially condemned content)\n"
        + "R-15 - restricted for 15 years (contains ecchi, idols, violence)\n"
        + "R-18 - restricted for 18 years (genitalis, coitus, offensive religious/racist/nationalist content)\n"
        + "R-18G - restricted for 18 years, guidance advised "
        + "(shemale, death, guro, scat, defecation, urination, etc.)", "ratingTooltip");
    translate("Welcome. Again.", "welcomeMessage");
    translate("Our friends", "friendsHeader");
    translate("News", "newsHeader");
    translate("Rules", "rulesHeader");
    translate("Back", "backText");
    translate("Update thread", "updateThreadText");
    translate("Auto update", "autoUpdateText");
    translate("Go", "goText");
    translate("Sort by:", "sortingModeLabelText");
    translate("Creation date", "sortingModeDateLabelText");
    translate("Last post date", "sortingModeRecentLabelText");
    translate("Bump count", "sortingModeBumpsLabelText");
    translate("Reply count:", "replyCountLabelText");
    translate("Loading posts...", "loadingPostsText");
    translate("New posts:", "newPostsText");
    translate("No new posts", "noNewPostsText");
    translate("kbps", "kbps");
    translate("Download file", "downloadPlaylistFileText");
    translate("Remove from playlist", "removeFromPlaylistText");
    translate("URL:", "linkLabelText");
    translate("This file exists on server. It will NOT be uploaded, but WILL be copied.", "fileExistsOnServerText");
    translate("Selected file is too large", "fileTooLargeWarningText");
    translate("MB", "megabytesText");
    translate("KB", "kilobytesText");
    translate("Byte(s)", "bytesText");
    translate("Album:", "audioTagAlbumText");
    translate("Artist:", "audioTagArtistText");
    translate("Title:", "audioTagTitleText");
    translate("Year:", "audioTagYearText");
    translate("posting is restricted (read-only access)", "postingRestrictedtext");
    translate("reading and posting are restricted", "readingAndPostingRestrictedtext");
    translate("Not banned", "banLevelNoneDescription");
    translate("Posting prohibited", "banLevelReadOnlyDescription");
    translate("Posting and reading prohibited", "banLevelNoAccessDescription");
    translate("Expires:", "banExpiresLabelText");
    translate("Reason:", "banReasonLabelText");
    translate("Delete all user posts on selected board", "delallButtonText");
    translate("Select all", "selectAllText");
    translate("Post source text", "postSourceText");
    translate("Expand video", "expandVideoText");
    translate("Collapse video", "collapseVideoText");
    translate("Favorite threads", "favoriteThreadsText");
    translate("Go complain to your mum, you whiner!", "complainMessage");
    translate("Auto update", "autoUpdateText");
    translate("Close", "closeButtonText");
    translate("Remove from hidden post/thread list", "removeFromHiddenPostListText");
    translate("Hidden posts/threads", "hiddenPostListText");
    translate("Settings", "settingsDialogTitle");
    translate("If password is empty, current hashpass will be used", "enterPasswordText");
    translate("Enter password", "enterPasswordTitle");
    translate("Add files", "addFilesText");
    translate("Show markup", "showPostformMarkupText");
    translate("Hide markup", "hidePostformMarkupText");
    translate("Target board", "targetBoardLabelText");
    translate("Specify Vkontakte audio file", "attachFileByVkText");
    translate("Select a track", "selectTrackTitle");
    translate("Chat privately with this user", "chatWithUserText");
    translate("Highlight code (page reload required)", "sourceHighlightingLabelText");
    translate("Enable private chat", "chatLabelText");
    translate("Private chat", "chatText");
    translate("New private message", "newChatMessageText");
    translate("Send", "sendChatMessageButtonText");
    translate("Delete this chat", "deleteChatButtonText");
    translate("Loading threads...", "loadingThreadsMessage");
    translate("Loading posts...", "loadingPostsMessage");
    translate("Close voting", "closeVotingText");
    translate("Open voting", "openVotingText");
    translate("Tripcode activated for THIS THREAD only", "threadTripcodeActivatedText");
    translate("Tripcode deactivated for THIS THREAD only", "threadTripcodeDeactivatedText");
    translate("Global tripcode activated. Uncheck tripcode option OUTSIDE THREAD to disable it",
        "globalTripcodeActivatedText");
    translate("Global tripcode deactivated (except threads where it is activated explicitly)",
        "globalTripcodeDeactivatedText");
    translate("Close files only by clicking on them", "closeFilesByClickingOnlyLabelText");
    translate("Drafts", "draftsText");
    translate("Fill form with this draft", "fillFormWithDraftText");
    translate("Delete this draft", "deleteDraftText");
    translate("Show drafts", "showDraftsText");
    translate("Hide drafts", "hideDraftsText");
    translate("Expand thread", "expandThreadText");
    translate("Collapse thread", "collapseThreadText");
    translate("Redirecting to thread...", "redirectingToThreadText");
    Board.boardNames().forEach(function(boardName) {
        Board.board(boardName).addTranslations(translate);
    });
    return { tr: tr };
};

controller.initialize = function() {
    var path1 = __dirname + "/../views/partials";
    var path2 = __dirname + "/../public/templates/partials";
    var c = {};
    return FS.list(path1).then(function(fileNames) {
        c.fileNames = fileNames.map(function(fileName) {
            return path1 + "/" + fileName;
        });
        return FS.list(path2);
    }).then(function(fileNames) {
        publicPartials = fileNames.filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        }).map(function(fileName) {
            return fileName.split(".").shift();
        });
        c.fileNames = c.fileNames.concat(fileNames.map(function(fileName) {
            return path2 + "/" + fileName;
        })).filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        });
        var promises = c.fileNames.map(function(fileName) {
            FS.read(fileName).then(function(data) {
                var name = fileName.split("/").pop().split(".").shift();
                var ind = publicPartials.indexOf(name);
                if (ind >= 0) {
                    publicPartials[ind] = {
                        name: name,
                        data: data
                    };
                }
                partials[name] = data;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    }).then(function() {
        path1 = __dirname + "/../views";
        path2 = __dirname + "/../public/templates";
        return FS.list(path1).then(function(fileNames) {
            c.fileNames = fileNames.map(function(fileName) {
                return path1 + "/" + fileName;
            });
            return FS.list(path2);
        });
    }).then(function(fileNames) {
        publicTemplates = fileNames.filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        }).map(function(fileName) {
            return fileName.split(".").shift();
        });
        c.fileNames = c.fileNames.concat(fileNames.map(function(fileName) {
            return path2 + "/" + fileName;
        })).filter(function(fileName) {
            return fileName.split(".").pop() == "jst";
        });
        var promises = c.fileNames.map(function(fileName) {
            FS.read(fileName).then(function(data) {
                var name = fileName.split("/").pop().split(".").shift();
                var ind = publicTemplates.indexOf(name);
                if (ind >= 0) {
                    publicTemplates[ind] = {
                        name: name,
                        data: data
                    };
                }
                templates[name] = dot.template(data, {
                    evaluate: /\{\{([\s\S]+?)\}\}/g,
                    interpolate: /\{\{=([\s\S]+?)\}\}/g,
                    encode: /\{\{!([\s\S]+?)\}\}/g,
                    use: /\{\{#([\s\S]+?)\}\}/g,
                    define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
                    conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
                    iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
                    varname: 'it',
                    strip: false,
                    append: true,
                    selfcontained: false
                }, partials);
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    });
};

controller.postingSpeedString = function(board, lastPostNumber) {
    var msecs = board.launchDate.valueOf();
    if (isNaN(msecs))
        return "-";
    var zeroSpeedString = function(nonZero) {
        if (lastPostNumber && msecs)
            return "1 " + nonZero;
        else
            return "0 " + Tools.translate("post(s) per hour.", "postingSpeed");
    };
    var speedString = function(duptime) {
        var d = lastPostNumber / duptime;
        var ss = "" + d.toFixed(1);
        return (ss.split(".").pop() != "0") ? ss : ss.split(".").shift();
    };
    var uptimeMsecs = (new Date()).valueOf() - msecs;
    var duptime = uptimeMsecs / Tools.Hour;
    var uptime = Math.floor(duptime);
    var shour = Tools.translate("post(s) per hour.", "postingSpeed");
    if (!uptime) {
        return zeroSpeedString(shour);
    } else if (Math.floor(lastPostNumber / uptime) > 0) {
        return speedString(duptime) + " " + shour;
    } else {
        duptime /= 24;
        uptime = Math.floor(duptime);
        var sday = Tools.translate("post(s) per day.", "postingSpeed");
        if (!uptime) {
            return zeroSpeedString(sday);
        } else if (Math.floor(lastPostNumber / uptime) > 0) {
            return speedString(duptime) + " " + sday;
        } else {
            duptime /= (365.0 / 12.0);
            uptime = Math.floor(duptime);
            var smonth = Tools.translate("post(s) per month.", "postingSpeed");
            if (!uptime) {
                return zeroSpeedString(smonth);
            } else if (Math.floor(lastPostNumber / uptime) > 0) {
                return speedString(duptime) + " " + smonth;
            } else {
                duptime /= 12.0;
                uptime = Math.floor(duptime);
                var syear = Tools.translate("post(s) per year.", "postingSpeed");
                if (!uptime)
                    return zeroSpeedString(syear);
                else if (Math.floor(lastPostNumber / uptime) > 0)
                    return speedString(duptime) + " " + syear;
                else
                    return "0 " + syear;
            }
        }
    }
};

module.exports = controller;

var Board = require("../boards/board");
var Captcha = require("../captchas");
var config = require("./config");
var Database = require("./database");
var markup = require("./markup");
var Tools = require("./tools");
