lord.loadedTabContent = {};
lord.currentDirectories = ["./"];
lord.currentFile = null;

lord.editBanReason = function(a) {
    var inp = $(a).closest("tr").find("[name^='banReason_'], [name='reason']")[0];
    var div = lord.node("div");
    var input = lord.node("input");
    input.type = "text";
    input.size = 40;
    input.value = inp.value;
    div.appendChild(input);
    lord.showDialog(div, { title: lord.text("editBanReasonText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        inp.value = input.value;
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.banUser = function(e, form) {
    e.preventDefault();
    var c = {};
    var ip = lord.nameOne("userIp", form).value;
    var formData = new FormData(form);
    var settings = lord.settings();
    var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : lord.model("base").site.timeOffset;
    formData.append("timeOffset", timeOffset);
    return lord.post(form.action, formData).then(function() {
        return lord.api("bannedUser", { ip: ip });
    }).then(function(user) {
        var previous = $(form).closest("div")[0];
        var name = previous.getAttribute("name");
        if (!name && !lord.hasOwnProperties(user.bans))
            return Promise.resolve();
        lord.createBannedUser(user, name ? previous : null);
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.registerUser = function(e, form) {
    e.preventDefault();
    var c = {};
    var inp = lord.nameOne("password", form);
    var password = inp.value;
    if ("text" == inp.type) {
        return lord.post(form.action, new FormData(form)).then(function(result) {
            return lord.api("registeredUser", { hashpass: result.hashpass });
        }).then(function(user) {
            lord.createRegisteredUser(user);
            return Promise.resolve();
        }).catch(lord.handleError);
    } else {
        var action = "/" + lord.data("sitePathPrefix") + "action/updateRegisteredUser";
        return lord.post(action, new FormData(form)).then(function() {
            return lord.api("registeredUser", { hashpass: password });
        }).then(function(user) {
            var previous = $(form).closest("div")[0];
            lord.createRegisteredUser(user, previous);
            return Promise.resolve();
        }).catch(lord.handleError);
    }
};

lord.removeBannedUser = function(btn) {
    var div = $(btn).closest(".bannedUser")[0];
    $(div.previousElementSibling).remove();
    $(div).remove();
    $("#bans").accordion("refresh");
};

lord.removeRegisteredUser = function(btn) {
    var div = $(btn).closest(".registeredUser")[0];
    var hashpass = $(btn).closest("form").find("[name='password']")[0].value;
    var cdiv = lord.node("div");
    cdiv.appendChild(lord.node("text", lord.text("confirmationText")));
    lord.showDialog(cdiv, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("hashpass", hashpass);
        return lord.post("/" + lord.data("sitePathPrefix") + "action/unregisterUser", formData);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        $(div.previousElementSibling).remove();
        $(div).remove();
        $("#users").accordion("refresh");
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.bansSelectAll = function(e, btn) {
    e.preventDefault();
    var form = $(btn).closest("form")[0];
    var level = lord.queryAll("[name='level'] > input", form).filter(function(inp) {
        return inp.checked;
    })[0].value;
    var expires = lord.nameOne("expires", form).value;
    var reason = lord.nameOne("reason", form).value;
    lord.nameAll("board", form).forEach(function(div) {
        $(".banLevelSelect > input[value='" + level + "']", div).click();
        lord.queryAll("input", div).forEach(function(inp) {
            if (inp.name.substr(0, 11) == "banExpires_") {
                inp.value = expires;
                $(inp).attr("value", expires);
            } else if (inp.name.substr(0, 10) == "banReason_") {
                inp.value = reason;
            }
        });
    });
};

lord.userAccessLevelsSelectAll = function(e, btn) {
    e.preventDefault();
    var form = $(btn).closest("form")[0];
    var levelInd = lord.nameOne("level", form).selectedIndex;
    lord.queryAll("select[name^='accessLevel_']", form).forEach(function(sel) {
        sel.selectedIndex = levelInd;
    });
};

lord.clearDate = function(a, inputName) {
    var form = $(a).closest("form")[0];
    var inp = lord.nameOne(inputName, form);
    inp.value = "____/__/__ __:__";
    $(inp).attr("value", "");
};

lord.delall = function(e, form) {
    e.preventDefault();
    var formData = new FormData(form);
    formData.append("userIp", $(form).parent().find("[name='userIp']")[0].value);
    return lord.post(form.action, formData).then(function() {
        lord.reloadPage();
        return Promise.resolve();
    }).catch(function(err) {
        console.log(err);
    });
};

lord.createBannedUser = function(user, replaced) {
    var bans = lord.id("bans");
    var model = lord.model(["base", "tr", "boards"]);
    model.bannedUser = user;
    model.submitButtonVisible = true;
    var settings = lord.settings();
    var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : model.site.timeOffset;
    model.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(model.site.locale).format("YYYY/MM/DD HH:mm");
    };
    var node = lord.template("userBan", model);
    if (replaced) {
        bans.replaceChild(node, replaced);
    } else {
        var span = lord.node("span");
        $(span).addClass("bannedUserHeader");
        span.appendChild(lord.node("text", (user && (user.ipv4 || user.ip)) || lord.text("newBanText")));
        var empty = lord.queryOne(".bannedUser:not([name])", bans);
        if (empty) {
            bans.insertBefore(node, empty.previousElementSibling);
            bans.insertBefore(span, node);
        } else {
            bans.appendChild(span);
            bans.appendChild(node);
        }
    }
    if ($(bans).hasClass("ui-accordion"))
        $(bans).accordion("refresh");
    return node;
};

lord.createRegisteredUser = function(user, replaced) {
    var div = lord.id("users");
    var model = lord.model(["base", "tr", "boards"]);
    model.registeredUser = user;
    var node = lord.template("registeredUser", model);
    if (replaced) {
        div.replaceChild(node, replaced);
    } else {
        var span = lord.node("span");
        $(span).addClass("registeredUserHeader");
        span.appendChild(lord.node("text", (user && user.hashpass) || lord.text("newUserText")));
        var empty = lord.queryOne(".registeredUser:not([name])", div);
        if (empty) {
            div.insertBefore(node, empty.previousElementSibling);
            div.insertBefore(span, node);
        } else {
            div.appendChild(span);
            div.appendChild(node);
        }
    }
    if ($(div).hasClass("ui-accordion"))
        $(div).accordion("refresh");
    return node;
};

lord.initFileTree = function() {
    lord.currentFile = null;
    lord.currentDirectories = ["./"];
    var lbl = lord.id("currentDirectoryLabel");
    $(lbl).empty();
    lbl.appendChild(lord.node("text", lord.text("currentDirectoryLabelText") + " ./"));
    lbl = lord.id("currentFileLabel");
    $(lbl).empty();
    lbl.appendChild(lord.node("text", lord.text("currentFileLabelText")));
    var ndiv = lord.node("div");
    ndiv.id = "contentFileTree";
    var odiv = lord.id("contentFileTree");
    odiv.parentNode.replaceChild(ndiv, odiv);
    $("#contentFileTree").fileTree({
        root: "./",
        script: "/" + lord.data("sitePathPrefix") + "api/fileTree",
        multiFolder: false
    }).on("filetreeexpanded", function(e, data) {
        lord.currentDirectories.push(data.rel);
        var lbl = lord.id("currentDirectoryLabel");
        $(lbl).empty();
        lbl.appendChild(lord.node("text", lord.text("currentDirectoryLabelText") + " " + data.rel));
        $("#renameDirectory, #deleteDirectory").button("enable");
    }).on("filetreecollapsed", function(e, data) {
        var i = lord.currentDirectories.length - 1;
        while (i >= 0 && lord.currentDirectories[i] !== data.rel)
            --i;
        if (i >= 0)
            lord.currentDirectories.splice(i, lord.currentDirectories.length - i);
        var dir = lord.currentDirectories.slice(-1)[0];
        var lbl = lord.id("currentDirectoryLabel");
        $(lbl).empty();
        lbl.appendChild(lord.node("text", lord.text("currentDirectoryLabelText") + " " + dir));
        if ("./" == dir)
            $("#renameDirectory, #deleteDirectory").button("disable");
    }).on("filetreeclicked", function(e, data) {
        $(".fileActions > button").button("enable");
        lord.currentFile = data.rel;
        var lbl = lord.id("currentFileLabel");
        $(lbl).empty();
        lbl.appendChild(lord.node("text", lord.text("currentFileLabelText") + " " + data.rel));
    });
    $("#renameDirectory, #deleteDirectory").button("disable");
    $(".fileActions > button").button("disable");
};

lord.refreshFrequentlyUsedFiles = function() {
    var div = lord.id("frequentlyUsedFileActions");
    $(div).empty();
    lord.toArray(lord.getLocalObject("frequentlyUsedFiles", {})).sort(function(file1, file2) {
        if (file1.count < file2.count)
            return 1;
        else if (file1.count > file2.count)
            return -1;
        else
            return 0;
    }).slice(0, 10).forEach(function(file, i) {
        if (!i)
            lord.id("frequentlyUsedFileActionsContainer").style.display = "";
        var btn = lord.node("button");
        btn.appendChild(lord.node("text", file.name));
        btn.onclick = function() {
            lord.editFile(file.name);
        };
        $(btn).button();
        div.appendChild(btn);
        div.appendChild(lord.node("text", " "));
    });
};

lord.addFile = function(isDir) {
    var dir = lord.currentDirectories.slice(-1)[0];
    var model = lord.model(["base", "tr"]);
    model.dir = dir;
    model.isDir = isDir;
    var div = lord.template("addFileDialog", model);
    lord.showDialog(div, { title: isDir ? "addDirectoryDialogTitle" : "addFileDialogTitle" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.initFileTree();
    }).catch(lord.handleError);
};

lord.renameFile = function(isDir) {
    if (!isDir && !lord.currentFile)
        return;
    var dir = lord.currentDirectories.slice(-1)[0];
    var model = lord.model(["base", "tr"]);
    model.oldFileName = isDir ? dir : lord.currentFile;
    var div = lord.template("renameFileDialog", model);
    lord.showDialog(div, {
        title: isDir ? "renameDirectoryDialogTitle" : "renameFileDialogTitle",
        afterShow: function() {
            lord.nameOne("fileName", div).select();
        }
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.initFileTree();
    }).catch(lord.handleError);
};

lord.deleteFile = function(isDir) {
    if (!isDir && !lord.currentFile)
        return;
    var dir = lord.currentDirectories.slice(-1)[0];
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("confirmationText")));
    lord.showDialog(div,
        { title: isDir ? "deleteDirectoryDialogTitle" : "deleteFileDialogTitle" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("fileName", isDir ? dir : lord.currentFile);
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserDeleteFile", formData);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.initFileTree();
        lord.initFileTree();
    }).catch(lord.handleError);
};

lord.editFile = function(fileName) {
    if (!fileName && !lord.currentFile)
        return;
    fileName = fileName || lord.currentFile;
    var fileNames = lord.getLocalObject("frequentlyUsedFiles", {});
    if (fileNames.hasOwnProperty(fileName)) {
        fileNames[fileName].count += 1;
    } else {
        fileNames[fileName] = {
            name: fileName,
            count: 1
        };
    }
    lord.setLocalObject("frequentlyUsedFiles", fileNames);
    var modes = {
        "js": "javascript",
        "json": {
            name: "javascript",
            json: true
        },
        "css": "css",
        "html": "htmlmixed",
        "jst": "htmlmixed"
    };
    var editor;
    lord.api("fileContent", { fileName: fileName }).then(function(result) {
        var div = lord.node("div");
        var subdiv = lord.node("div");
        $(subdiv).width($(window).width() - 100).height($(window).height() - 150);
        div.appendChild(subdiv);
        editor = lord.createCodemirrorEditor(subdiv, modes[fileName.split(".").pop()] || "", result.content);
        return lord.showDialog(div, {
            afterShow: function() {
                editor.refresh();
                $(".CodeMirror", subdiv).css("height", "100%");
            }
        });
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("content", editor.getValue());
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserEditFile", formData);
    }).then(function(result) {
        lord.refreshFrequentlyUsedFiles();
    }).catch(lord.handleError);
};

lord.regenerateCache = function() {
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("reloadWarningText")));
    div.appendChild(lord.node("br"));
    var inp = lord.node("input");
    inp.type = "checkbox";
    div.appendChild(inp);
    div.appendChild(lord.node("text", lord.text("regenerateArchivedThreadsLabelText")));
    lord.showDialog(div, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        if (inp.checked)
            formData.append("regenerateArchive", "true");
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserRegenerateCache", formData);
    }).catch(lord.handleError);
};

lord.rerenderPosts = function() {
    var div = lord.template("rerenderPostsDialog", lord.model(["base", "tr", "boards"]));
    lord.showDialog(div, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", div);
        return lord.post(form.action, new FormData(form));
    }).catch(lord.handleError);
};

lord.rebuildSearchIndex = function() {
    var div = lord.node("div");
    lord.showDialog(div, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserRebuildSearchIndex", formData);
    }).catch(lord.handleError);
};

lord.reloadBoards = function() {
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("reloadWarningText")));
    lord.showDialog(div, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("boards", "true");
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserReload", formData);
    }).catch(lord.handleError);
};

lord.reloadConfig = function() {
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("reloadWarningText")));
    lord.showDialog(div, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("config", "true");
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserReload", formData);
    }).catch(lord.handleError);
};

lord.reloadTemplates = function() {
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("reloadWarningText")));
    lord.showDialog(div, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("templates", "true");
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserReload", formData);
    }).catch(lord.handleError);
};

lord.reloadAll = function() {
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("reloadWarningText")));
    lord.showDialog(div, { title: lord.text("confirmationText") }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("boards", "true");
        formData.append("config", "true");
        formData.append("templates", "true");
        return lord.post("/" + lord.data("sitePathPrefix") + "action/superuserReload", formData);
    }).catch(lord.handleError);
};

lord.loadTabContent = function(tab) {
    if (lord.loadedTabContent[tab])
        return;
    switch (tab) {
    case "users":
        if (!lord.id("users"))
            break;
        lord.api("registeredUsers").then(function(users) {
            var div = lord.id("users");
            $(div).empty();
            $(div).removeClass("loadingMessage");
            lord.gently(users || [], function(user) {
                lord.createRegisteredUser(user);
            }, {
                n: 5,
                delay: 10
            }).then(function() {
               lord.createRegisteredUser();
            }).catch(lord.handleError);
            $(div).accordion({
                collapsible: true,
                heightStyle: "content",
                icons: false,
                header: "span.registeredUserHeader",
                active: false
            });
        }).catch(lord.handleError);
        break;
    case "content":
        $(".directoryActions > button").button();
        $(".fileActions > button").button();
        $(".serverActions > button").button();
        lord.initFileTree();
        lord.refreshFrequentlyUsedFiles();
        break;
    default:
        break;
    }
    lord.loadedTabContent[tab] = {};
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.api("bannedUsers").then(function(users) {
        var div = lord.id("bans");
        $(div).empty();
        $(div).removeClass("loadingMessage");
        lord.gently(users || [], function(user) {
            lord.createBannedUser(user);
        }, {
            n: 5,
            delay: 10
        }).then(function() {
           lord.createBannedUser();
        }).catch(lord.handleError);
        $(div).accordion({
            collapsible: true,
            heightStyle: "content",
            icons: false,
            header: "span.bannedUserHeader",
            active: false,
            beforeActivate: function(e, ui) {
                var node = ui.newPanel[0];
                if (!node || node.processed)
                    return;
                var settings = lord.settings();
                var model = lord.model("base");
                var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : model.site.timeOffset;
                var formattedDate = function(date) {
                    return moment(date).utcOffset(timeOffset).locale(model.site.locale).format("YYYY/MM/DD HH:mm");
                };
                $(".banLevelSelect", node).buttonset();
                lord.queryAll("[name='expires'], [name^='banExpires_']", node).forEach(function(inp) {
                    $(inp).change(function(){
                        $(this).attr("value", $(inp).val());
                    });
                    var now = lord.now();
                    now.setTime(now.getTime() + (30 *lord.Minute));
                    var currentDate = formattedDate(now.toISOString());
                    $(inp).datetimepicker({
                        i18n: { format: "YYYY/MM/DD HH:mm" },
                        mask: true,
                        value: inp.value,
                        minDate: currentDate
                    });
                });
                node.processed = true;
            }
        });
    }).catch(lord.handleError);
}, false);
