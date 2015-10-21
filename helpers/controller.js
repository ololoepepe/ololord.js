var dot = require("dot");
var FS = require("q-io/fs");
var Highlight = require("highlight.js");
var merge = require("merge");
var Promise = require("promise");
var promisify = require("promisify-node");

var Board = require("../boards/board");
var Cache = require("./cache");
var Captcha = require("../captchas");
var config = require("./config");
var Database = require("./database");
var Tools = require("./tools");

var partials = {};

var controller = function(req, templateName, modelData, board) {
    var baseModelData = merge.recursive(controller.baseModel(req), controller.settingsModel(req));
    baseModelData = merge.recursive(baseModelData, controller.translationsModel());
    baseModelData = merge.recursive(baseModelData, controller.boardsModel());
    baseModelData.path = req.path;
    baseModelData.compareRatings = Database.compareRatings;
    if (!modelData)
        modelData = {};
    var template = Cache.get("template/" + templateName, "");
    if (template) {
        modelData = merge.recursive(baseModelData, modelData);
        modelData.req = req;
        return Promise.resolve(template(modelData));
    }
    return FS.read(__dirname + "/../views/" + templateName + ".jst").then(function(data) {
        return Promise.resolve(dot.template(data, null, partials));
    }).then(function(template) {
        Cache.set("template/" + templateName, template);
        modelData = merge.recursive(baseModelData, modelData);
        modelData.req = req;
        return Promise.resolve(template(modelData));
    });
};

controller.baseModel = function(req) {
    return {
        site: {
            protocol: config("site.protocol", "http"),
            domain: config("site.domain", "localhost:8080"),
            pathPrefix: config("site.pathPrefix", "")
        },
        user: {
            ip: req.ip,
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
        styles: [
            {
                name: "burichan",
                title: "Burichan"
            }, {
                name: "futaba",
                title: "Futaba"
            }, {
                name: "neutron",
                title: "Neutron"
            }, {
                name: "photon",
                title: "Photon"
            }
        ],
        deviceType: ((req.device.type == "desktop") ? "desktop" : "mobile"),
        availableCodeLangs: Highlight.listLanguages()
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
    if (typeof board == "string") {
        if (!Tools.contains(Board.boardNames(), board))
            return null;
        board = Board.board(board);
    }
    return {
        board: {
            name: board.name,
            title: board.title,
            defaultUserName: board.defaultUserName,
            showWhois: board.showWhois,
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

controller.navbarModel = function() {
    return {
        boards: Board.boardInfos()
    };
};

controller.settingsModel = function(req) {
    return { settings: req.settings };
};

controller.translationsModel = function() {
    return {
        tr: {
            toPlaylistPageText: Tools.translate("Playlist"),
            toMarkupPageText: Tools.translate("Markup"),
            toHomePageText: Tools.translate("Home"),
            framedVersionText: Tools.translate("Framed version"),
            toFaqPageText: Tools.translate("F.A.Q."),
            toManagePageText: Tools.translate("User management"),
            kbps: Tools.translate("kbps"),
            unknownAlbum: Tools.translate("Unknown album"),
            unknownArtist: Tools.translate("Unknown artist"),
            unknownTitle: Tools.translate("Unknown title"),
            hideByImageText: Tools.translate("Hide by image hash"),
            toThread: Tools.translate("Answer"),
            referencedByText: Tools.translate("Answers:"),
            fixedText: Tools.translate("Fixed"),
            closedText: Tools.translate("The thread is closed"),
            draftText: Tools.translate("Draft"),
            registeredText: Tools.translate("This user is registered"),
            postLimitReachedText: Tools.translate("Post limit reached"),
            bumpLimitReachedText: Tools.translate("Bump limit reached"),
            quickReplyText: Tools.translate("Quick reply"),
            postActionsText: Tools.translate("Post actions"),
            addFileText: Tools.translate("Add file"),
            editPostText: Tools.translate("Edit post"),
            fixThreadText: Tools.translate("Fix thread"),
            unfixThreadText: Tools.translate("Unfix thread"),
            closeThreadText: Tools.translate("Close thread"),
            openThreadText: Tools.translate("Open thread"),
            moveThreadText: Tools.translate("Move thread"),
            showUserIpText: Tools.translate("Show user IP"),
            banUserText: Tools.translate("Ban user"),
            downloadThreadText: Tools.translate("Download all thread files as a .zip archive"),
            complainText: Tools.translate("Complain"),
            addThreadToFavoritesText: Tools.translate("Add thread to favorites"),
            deleteThreadText: Tools.translate("Delete thread"),
            deletePostText: Tools.translate("Delete post"),
            showHidePostText: Tools.translate("Hide/show"),
            modificationDateTimeText: Tools.translate("Last modified:"),
            bannedForText: Tools.translate("User was banned for this post"),
            deleteFileText: Tools.translate("Delete file"),
            findSourceWithIqdbText: Tools.translate("Find source with Iqdb"),
            findSourceWithGoogleText: Tools.translate("Find source with Google"),
            editAudioTagsText: Tools.translate("Edit audio file tags"),
            addToPlaylistText: Tools.translate("Add to playlist"),
            answerInThreadText: Tools.translate("Create thread"),
            createThreadText: Tools.translate("Answer in this thread"),
            boardRulesLinkText: Tools.translate("Borad rules"),
            boardCatalogLinkText: Tools.translate("Threads catalog"),
            boardRssLinkText: Tools.translate("RSS feed"),
            postingDisabledBoardText: Tools.translate("Posting is disabled for this board"),
            postingDisabledThreadText: Tools.translate("Posting is disabled for this thread"),
            toPreviousPageText: Tools.translate("Previous page"),
            toNextPageText: Tools.translate("Next page"),
            postingSpeedText: Tools.translate("Posting speed:"),
            omittedPostsText: Tools.translate("Posts omitted:"),
            omittedFilesText: Tools.translate("files omitted:"),
            toTopText: Tools.translate("Scroll to the top"),
            toBottomText: Tools.translate("Scroll to the bottom"),
            searchInputPlaceholder: Tools.translate("Search: possible +required -excluded"),
            allBoardsText: Tools.translate("All boards"),
            searchButtonText: Tools.translate("Search"),
            settingsButtonText: Tools.translate("Settings"),
            showFavoritesText: Tools.translate("Favorites"),
            mumWatchingText: Tools.translate("Mum is watching me!"),
            logoutText: Tools.translate("Log out"),
            loginText: Tools.translate("Log in"),
            loginPlaceholderText: Tools.translate("Password/hashpass"),
            showPasswordText: Tools.translate("Show password"),
            loginSystemDescriptionText: Tools.translateVar("loginSystemDescriptionText"),
            hotkeyPreviousPageImageLabelText: Tools.translate("Previous page/file"),
            hotkeyNextPageImageLabelText: Tools.translate("Next page/file"),
            hotkeyPreviousThreadPostLabelText: Tools.translate("Previous thread on board/post in thread"),
            hotkeyNextThreadPostLabelText: Tools.translate("Next thread on board/post in thread"),
            hotkeyPreviousPostLabelText: Tools.translate("Previous post in thread/on board"),
            hotkeyNextPostLabelText: Tools.translate("Next post in thread/on board"),
            hotkeyHidePostLabelText: Tools.translate("Hide post/thread"),
            hotkeyGoToThreadLabelText: Tools.translate("Go to thread"),
            hotkeyExpandThreadLabelText: Tools.translate("Expand thread"),
            hotkeyExpandImageLabelText: Tools.translate("Expand post file"),
            hotkeyQuickReplyLabelText: Tools.translate("Quick reply"),
            hotkeySubmitReplyLabelText: Tools.translate("Submit reply"),
            hotkeyShowFavoritesLabelText: Tools.translate("Show favorite threads"),
            hotkeyShowSettingsLabelText: Tools.translate("Show settings"),
            hotkeyUpdateThreadLabelText: Tools.translate("Update thread"),
            hotkeyMarkupBoldLabelText: Tools.translate("Bold text"),
            hotkeyMarkupItalicsLabelText: Tools.translate("Italics"),
            hotkeyMarkupStrikedOutLabelText: Tools.translate("Striked out text"),
            hotkeyMarkupUnderlinedLabelText: Tools.translate("Underlined text"),
            hotkeyMarkupSpoilerLabelText: Tools.translate("Spoiler"),
            hotkeyMarkupQutationLabelText: Tools.translate("Quote selected text"),
            hotkeyMarkupCodeLabelText: Tools.translate("Code block"),
            generalSettingsLegendText: Tools.translate("General settings"),
            modeLabelText: Tools.translate("Mode:"),
            styleLabelText: Tools.translate("Style:"),
            postShrinkingLabelText: Tools.translate("Shrink posts:"),
            stickyToolbarLabelText: Tools.translate("Sticky toolbar:"),
            timeLabelText: Tools.translate("Time:"),
            timeServerText: Tools.translate("Server"),
            timeLocalText: Tools.translate("Local"),
            timeZoneOffsetLabelText: Tools.translate("Offset:"),
            captchaLabelText: Tools.translate("Captcha:"),
            maxAllowedRatingLabelText: Tools.translate("Maximum allowed rating:"),
            draftsByDefaultLabelText: Tools.translate("Mark posts as drafts by default:"),
            hidePostformRulesLabelText: Tools.translate("Hide postform rules:"),
            minimalisticPostformLabelText: Tools.translate("Use minimalistic post form:"),
            hiddenBoardsLabelText: Tools.translate("Hide boards:"),
            captchaLabelWarningText: Tools.translate("This option may be ignored on some boards"),
            scriptSettingsLegendText: Tools.translate("Script settings"),
            postsTabText: Tools.translate("Posts and threads"),
            filesTabText: Tools.translate("Files"),
            postformTabText: Tools.translate("Postform and posting"),
            hidingTabText: Tools.translate("Hiding"),
            otherTabText: Tools.translate("Other"),
            autoUpdateThreadsByDefaultLabelText: Tools.translate("Auto update threads by default:"),
            autoUpdateIntervalLabelText: Tools.translate("Auto update interval (sec):"),
            showAutoUpdateTimerLabelText: Tools.translate("Show auto update timer:"),
            showAutoUpdateDesktopNotificationsLabelText: Tools.translate("Show desktop notifications:"),
            signOpPostLinksLabelText: Tools.translate("Mark OP post links:"),
            signOwnPostLinksLabelText: Tools.translate("Mark own post links:"),
            showLeafButtonsLabelText: Tools.translate("Show file leaf buttons:"),
            leafThroughImagesOnlyLabelText: Tools.translate("Leaf through images only:"),
            imageZoomSensitivityLabelText: Tools.translate("Image zoom sensitivity, %:"),
            defaultAudioVideoVolumeLabelText: Tools.translate("Default audio and video files volume:"),
            rememberAudioVideoVolumeLabelText: Tools.translate("Remember volume:"),
            playAudioVideoImmediatelyLabelText: Tools.translate("Play audio and video files immediately:"),
            loopAudioVideoLabelText: Tools.translate("Loop audio and video files:"),
            quickReplyActionLabelText: Tools.translate("Quick reply outside thread:"),
            quickReplyActionGotoThreadText: Tools.translate("Redirects to thread"),
            quickReplyActionDoNothingText: Tools.translate("Leaves page unmodified"),
            quickReplyActionAppendPostText: Tools.translate("Appends a new post"),
            moveToPostOnReplyInThreadLabelText: Tools.translate("Move to post after replying in thread:"),
            checkFileExistenceLabelText: Tools.translate("Check if attached file exists on server:"),
            showAttachedFilePreviewLabelText: Tools.translate("Show previews when attaching files:"),
            addToFavoritesOnReplyLabelText: Tools.translate("Add thread to favorites on reply:"),
            hidePostformMarkupLabelText: Tools.translate("Hide postform markup:"),
            stripExifFromJpegLabelText: Tools.translate("Strip EXIF from JPEG files:"),
            hideTripcodesLabelText: Tools.translate("Hide tripcodes:"),
            hideUserNamesLabelText: Tools.translate("Hide user names:"),
            strikeOutHiddenPostLinksLabelText: Tools.translate("Strike out links to hidden posts:"),
            spellsLabelText: Tools.translate("Spells (command-based post hiding):"),
            editSpellsText: Tools.translate("Edit"),
            showHiddenPostListText: Tools.translate("Show hidden post/thread list"),
            maxSimultaneousAjaxLabelText: Tools.translate("Maximum simultaneous AJAX requests:"),
            showNewPostsLabelText: Tools.translate("Show new post count near board names:"),
            showYoutubeVideoTitleLabelText: Tools.translate("Show titles of YouTube videos:"),
            hotkeysLabelText: Tools.translate("Hotkeys:"),
            editHotkeysText: Tools.translate("Edit"),
            editUserCssText: Tools.translate("Edit"),
            userCssLabelText: Tools.translate("User CSS:"),
            cancelButtonText: Tools.translate("Cancel"),
            confirmButtonText: Tools.translate("Confirm"),
            showPostFormText: Tools.translate("Show post form"),
            hidePostFormText: Tools.translate("Hide post form"),
            postFormPlaceholderEmail: Tools.translate("E-mail"),
            postFormButtonSubmit: Tools.translate("Submit"),
            postFormLabelEmail: Tools.translate("E-mail:"),
            postFormPlaceholderName: Tools.translate("Name"),
            postFormLabelName: Tools.translate("Name:"),
            postFormPlaceholderSubject: Tools.translate("Subject"),
            postFormLabelSubject: Tools.translate("Subject:"),
            postFormTextPlaceholder: Tools.translate("Comment. Max length:"),
            postFormLabelText: Tools.translate("Post:"),
            markupBold: Tools.translate("Bold text"),
            markupItalics: Tools.translate("Italics"),
            markupStrikedOut: Tools.translate("Striked out text"),
            markupUnderlined: Tools.translate("Underlined text"),
            markupSpoiler: Tools.translate("Spoiler"),
            markupQuotation: Tools.translate("Quote selected text"),
            markupCodeLang: Tools.translate("Code block syntax"),
            markupCode: Tools.translate("Code block"),
            markupSubscript: Tools.translate("Subscript"),
            markupSuperscript: Tools.translate("Superscript"),
            markupUrl: Tools.translate("URL (external link)"),
            postFormLabelMarkupMode: Tools.translate("Markup mode:"),
            postFormLabelOptions: Tools.translate("Options:"),
            postFormLabelRaw: Tools.translate("Raw HTML:"),
            postFormLabelSignAsOp: Tools.translate("OP:"),
            postFormLabelTripcode: Tools.translate("Tripcode:"),
            postFormLabelDraft: Tools.translate("Draft:"),
            postFormInputFile: Tools.translate("File(s):"),
            selectFileText: Tools.translate("Select file"),
            removeFileText: Tools.translate("Remove this file"),
            ratingLabelText: Tools.translate("Rating:"),
            attachFileByLinkText: Tools.translate("Specify file URL"),
            postFormPlaceholderPassword: Tools.translate("Password"),
            postFormLabelPassword: Tools.translate("Password:"),
            postFormLabelCaptcha: Tools.translate("Captcha:"),
            noCaptchaText: Tools.translate("You don't have to enter captcha"),
            captchaQuotaText: Tools.translate("Posts left:"),
            showPostformRulesText: Tools.translate("Show rules"),
            hidePostformRulesText: Tools.translate("Hide rules")
        }
    };
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
