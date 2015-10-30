var dot = require("dot");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Highlight = require("highlight.js");
var merge = require("merge");
var moment = require("moment");
var Path = require("path");
var promisify = require("promisify-node");
var Util = require("util");

var Board = require("../boards/board");
var Cache = require("./cache");
var Captcha = require("../captchas");
var config = require("./config");
var Database = require("./database");
var markup = require("./markup");
var Tools = require("./tools");

var partials = {};
var langNames = null;

var controller;

var customContent = function(req, name) {
    return Tools.localeBasedFileName(__dirname + "/../views/custom/" + name + "/content.jst").then(function(fileName) {
        if (!fileName)
            return Promise.resolve(null);
        return controller(req, "custom/" + name + "/" + Path.basename(fileName, ".jst"));
    });
};

controller = function(req, templateName, modelData) {
    var baseModelData = merge.recursive(controller.baseModel(req), controller.settingsModel(req));
    baseModelData = merge.recursive(baseModelData, controller.translationsModel());
    baseModelData = merge.recursive(baseModelData, controller.boardsModel());
    baseModelData.path = req.path;
    baseModelData.compareRatings = Database.compareRatings;
    baseModelData.compareRegisteredUserLevels = Database.compareRegisteredUserLevels;
    baseModelData.formattedDate = function(date) {
        return moment(date).locale(config("site.locale", "en")).format(config("site.dateFormat",
            "MM/DD/YYYY hh:mm:ss"));
    };
    if (!modelData)
        modelData = {};
    var template = Cache.get("template/" + templateName, "");
    var f = function(template, baseModelData, modelData) {
        var p;
        if (templateName.substr(0, 13) == "custom/footer" || templateName.substr(0, 13) == "custom/header"
            || templateName.substr(0, 11) == "custom/home") {
            p = Promise.resolve();
        } else {
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
    if (template)
        return f(template, baseModelData, modelData);
    return FS.read(__dirname + "/../views/" + templateName + ".jst").then(function(data) {
        return Promise.resolve(dot.template(data, {
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
        }, partials));
    }).then(function(template) {
        Cache.set("template/" + templateName, template);
        return f(template, baseModelData, modelData);
    });
};

controller.customContent = customContent;

controller.baseModel = function(req) {
    if (!langNames) {
        var list = FSSync.readFileSync(__dirname + "/../misc/lang-names.txt", "utf8").split(/\r?\n+/gi);
        langNames = {};
        list.forEach(function(pair) {
            if (!pair)
                return;
            var sl = pair.split(/\s+/gi);
            if (sl.length != 2)
                return;
            var lang = sl[0];
            var name = sl[1];
            if (!lang || !name)
                return;
            langNames[lang] = name;
        });
    }
    return {
        site: {
            protocol: config("site.protocol", "http"),
            domain: config("site.domain", "localhost:8080"),
            pathPrefix: config("site.pathPrefix", "")
        },
        user: {
            ip: req.trueIp,
            level: req.level,
            loggedIn: !!req.hashpass
        },
        modes: [
            {
                name: "normal",
                title: Tools.translate("Normal")
            }, {
                name: "ascetic",
                title: Tools.translate("Ascetic")
            }
        ],
        styles: Tools.styles(),
        codeStyles: Tools.codeStyles(),
        deviceType: ((req.device.type == "desktop") ? "desktop" : "mobile"),
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
        locale: config("site.locale", "en"),
        dateFormat: config("site.dateFormat", "MM/DD/YYYY hh:mm:ss"),
        supportedCaptchaEngines: Captcha.captchaIds().map(function(id) {
            var captcha = Captcha.captcha(id);
            return {
                id: captcha.id,
                title: captcha.title
            };
        })
    };
};

controller.boardsModel = function() {
    var boards = Board.boardNames().map(function(boardName) {
        var board = Board.board(boardName);
        return {
            name: board.name,
            title: board.title,
            defaultUserName: board.defaultUserName,
            showWhois: board.showWhois,
            hidden: board.hidden,
            postingEnabled: board.postingEnabled,
            draftsEnabled: board.draftsEnabled,
            captchaEnabled: board.captchaEnabled,
            maxEmailFieldLength: board.maxEmailFieldLength,
            maxNameFieldLength: board.maxNameFieldLength,
            maxSubjectFieldLength: board.maxSubjectFieldLength,
            maxTextLength: board.maxTextLength,
            maxPasswordFieldLength: board.maxPasswordFieldLength,
            maxFileCount: board.maxFileCount,
            maxFileSize: board.maxFileSize,
            maxLastPosts: board.maxLastPosts,
            markupElements: board.markupElements,
            supportedFileTypes: board.supportedFileTypes,
            supportedCaptchaEngines: board.supportedCaptchaEngines
        };
    });
    return { boards: boards };
};

controller.boardModel = function(board) {
    if (Util.isString(board))
        board = Board.board(board);
    if (!board)
        return null;
    return {
        board: {
            name: board.name,
            title: board.title,
            defaultUserName: board.defaultUserName,
            showWhois: board.showWhois,
            hidden: board.hidden,
            postingEnabled: board.postingEnabled,
            draftsEnabled: board.draftsEnabled,
            captchaEnabled: board.captchaEnabled,
            maxEmailFieldLength: board.maxEmailFieldLength,
            maxNameFieldLength: board.maxNameFieldLength,
            maxSubjectFieldLength: board.maxSubjectFieldLength,
            maxTextLength: board.maxTextLength,
            maxPasswordFieldLength: board.maxPasswordFieldLength,
            maxFileCount: board.maxFileCount,
            maxFileSize: board.maxFileSize,
            maxLastPosts: board.maxLastPosts,
            markupElements: board.markupElements,
            supportedFileTypes: board.supportedFileTypes,
            supportedCaptchaEngines: board.supportedCaptchaEngines
        }
    };
};

controller.headModel = function(board, req) {
    return {
        title: board.title
    };
};

controller.settingsModel = function(req) {
    return { settings: req.settings };
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
    translate("F.A.Q.", "toFaqPageText");
    translate("User management", "toManagePageText");
    translate("kbps", "kbps");
    translate("Unknown album", "unknownAlbum");
    translate("Unknown artist", "unknownArtist");
    translate("Unknown title", "unknownTitle");
    translate("Hide by image hash", "hideByImageText");
    translate("Answer", "toThread");
    translate("Answers:", "referencedByText");
    translate("Fixed", "fixedText");
    translate("The thread is closed", "closedText");
    translate("Draft", "draftText");
    translate("This user is registered", "registeredText");
    translate("Post limit reached", "postLimitReachedText");
    translate("Bump limit reached", "bumpLimitReachedText");
    translate("Quick reply", "quickReplyText");
    translate("Post actions", "postActionsText");
    translate("Add file", "addFileText");
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
    translate("Delete thread", "deleteThreadText");
    translate("Delete post", "deletePostText");
    translate("Hide/show", "showHidePostText");
    translate("Last modified:", "modificationDateTimeText");
    translate("User was banned for this post", "bannedForText");
    translate("Delete file", "deleteFileText");
    translate("Find source with Iqdb", "findSourceWithIqdbText");
    translate("Find source with Google", "findSourceWithGoogleText");
    translate("Edit audio file tags", "editAudioTagsText");
    translate("Add to playlist", "addToPlaylistText");
    translate("Answer in this thread", "answerInThreadText");
    translate("Create thread", "createThreadText");
    translate("Borad rules", "boardRulesLinkText");
    translate("Threads catalog", "boardCatalogLinkText");
    translate("RSS feed", "boardRssLinkText");
    translate("Posting is disabled for this board", "postingDisabledBoardText");
    translate("Posting is disabled for this thread", "postingDisabledThreadText");
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
    translate("Previous thread on board/post in thread", "hotkeyPreviousThreadPostLabelText");
    translate("Next thread on board/post in thread", "hotkeyNextThreadPostLabelText");
    translate("Previous post in thread/on board", "hotkeyPreviousPostLabelText");
    translate("Next post in thread/on board", "hotkeyNextPostLabelText");
    translate("Hide post/thread", "hotkeyHidePostLabelText");
    translate("Go to thread", "hotkeyGoToThreadLabelText");
    translate("Expand thread", "hotkeyExpandThreadLabelText");
    translate("Expand post file", "hotkeyExpandImageLabelText");
    translate("Quick reply", "hotkeyQuickReplyLabelText");
    translate("Submit reply", "hotkeySubmitReplyLabelText");
    translate("Show favorite threads", "hotkeyShowFavoritesLabelText");
    translate("Show settings", "hotkeyShowSettingsLabelText");
    translate("Update thread", "hotkeyUpdateThreadLabelText");
    translate("Bold text", "hotkeyMarkupBoldLabelText");
    translate("Italics", "hotkeyMarkupItalicsLabelText");
    translate("Striked out text", "hotkeyMarkupStrikedOutLabelText");
    translate("Underlined text", "hotkeyMarkupUnderlinedLabelText");
    translate("Spoiler", "hotkeyMarkupSpoilerLabelText");
    translate("Quote selected text", "hotkeyMarkupQutationLabelText");
    translate("Code block", "hotkeyMarkupCodeLabelText");
    translate("General settings", "generalSettingsLegendText");
    translate("Mode:", "modeLabelText");
    translate("Style:", "styleLabelText");
    translate("Code style:", "codeStyleLabelText");
    translate("Shrink posts:", "postShrinkingLabelText");
    translate("Sticky toolbar:", "stickyToolbarLabelText");
    translate("Time:", "timeLabelText");
    translate("Server", "timeServerText");
    translate("Local", "timeLocalText");
    translate("Offset:", "timeZoneOffsetLabelText");
    translate("Captcha:", "captchaLabelText");
    translate("Maximum allowed rating:", "maxAllowedRatingLabelText");
    translate("Mark posts as drafts by default:", "draftsByDefaultLabelText");
    translate("Hide postform rules:", "hidePostformRulesLabelText");
    translate("Use minimalistic post form:", "minimalisticPostformLabelText");
    translate("Hide boards:", "hiddenBoardsLabelText");
    translate("This option may be ignored on some boards", "captchaLabelWarningText");
    translate("Script settings", "scriptSettingsLegendText");
    translate("Posts and threads", "postsTabText");
    translate("Files", "filesTabText");
    translate("Postform and posting", "postformTabText");
    translate("Hiding", "hidingTabText");
    translate("Other", "otherTabText");
    translate("Auto update threads by default:", "autoUpdateThreadsByDefaultLabelText");
    translate("Auto update interval (sec):", "autoUpdateIntervalLabelText");
    translate("Show auto update timer:", "showAutoUpdateTimerLabelText");
    translate("Show desktop notifications:", "showAutoUpdateDesktopNotificationsLabelText");
    translate("Mark OP post links:", "signOpPostLinksLabelText");
    translate("Mark own post links:", "signOwnPostLinksLabelText");
    translate("Show file leaf buttons:", "showLeafButtonsLabelText");
    translate("Leaf through images only:", "leafThroughImagesOnlyLabelText");
    translate("Image zoom sensitivity, %:", "imageZoomSensitivityLabelText");
    translate("Default audio and video files volume:", "defaultAudioVideoVolumeLabelText");
    translate("Remember volume:", "rememberAudioVideoVolumeLabelText");
    translate("Play audio and video files immediately:", "playAudioVideoImmediatelyLabelText");
    translate("Loop audio and video files:", "loopAudioVideoLabelText");
    translate("Quick reply outside thread:", "quickReplyActionLabelText");
    translate("Redirects to thread", "quickReplyActionGotoThreadText");
    translate("Leaves page unmodified", "quickReplyActionDoNothingText");
    translate("Appends a new post", "quickReplyActionAppendPostText");
    translate("Move to post after replying in thread:", "moveToPostOnReplyInThreadLabelText");
    translate("Check if attached file exists on server:", "checkFileExistenceLabelText");
    translate("Show previews when attaching files:", "showAttachedFilePreviewLabelText");
    translate("Add thread to favorites on reply:", "addToFavoritesOnReplyLabelText");
    translate("Hide postform markup:", "hidePostformMarkupLabelText");
    translate("Strip EXIF from JPEG files:", "stripExifFromJpegLabelText");
    translate("Hide tripcodes:", "hideTripcodesLabelText");
    translate("Hide user names:", "hideUserNamesLabelText");
    translate("Strike out links to hidden posts:", "strikeOutHiddenPostLinksLabelText");
    translate("Spells (command-based post hiding):", "spellsLabelText");
    translate("Edit", "editSpellsText");
    translate("Show hidden post/thread list", "showHiddenPostListText");
    translate("Maximum simultaneous AJAX requests:", "maxSimultaneousAjaxLabelText");
    translate("Show new post count near board names:", "showNewPostsLabelText");
    translate("Show titles of YouTube videos:", "showYoutubeVideoTitleLabelText");
    translate("Hotkeys:", "hotkeysLabelText");
    translate("Edit", "editHotkeysText");
    translate("Edit", "editUserCssText");
    translate("User CSS:", "userCssLabelText");
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
    translate("Raw HTML:", "postFormLabelRaw");
    translate("OP:", "postFormLabelSignAsOp");
    translate("Tripcode:", "postFormLabelTripcode");
    translate("Draft:", "postFormLabelDraft");
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
    translate("\"Log in\", you say? On an imageboard? I am out!\n\n"
        + "Please, wait a sec. The login systyem does NOT store any data on the server. "
        + "It only stores a cookie on your PC to allow post editing, deleting, etc. without "
        + "entering password every time, and nothing else.\n\n"
        + "Well, actually, the admin may register someone manually (if he is a fag), "
        + "but there is no way to register through the web.", "loginSystemDescriptionText");
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
        c.fileNames = c.fileNames.concat(fileNames.map(function(fileName) {
            return path2 + "/" + fileName;
        }));
        var promises = c.fileNames.map(function(fileName) {
            FS.read(fileName).then(function(data) {
                partials[fileName.split("/").pop().split(".").shift()] = data;
                return Promise.resolve();
            });
        });
        return Promise.all(promises);
    });
};

module.exports = controller;
