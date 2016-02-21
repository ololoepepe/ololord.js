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
    return lord.post(form.action, new FormData(form)).then(function() {
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
    lord.removeSelf(div.previousElementSibling);
    lord.removeSelf(div);
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
        lord.removeSelf(div.previousElementSibling);
        lord.removeSelf(div);
        $("#users").accordion("refresh");
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.bansSelectAll = function(e, btn) {
    e.preventDefault();
    var form = $(btn).closest("form")[0];
    var level = lord.query("[name='level'] > input", form).filter(function(inp) {
        return inp.checked;
    })[0].value;
    var expires = lord.nameOne("expires", form).value;
    var reason = lord.nameOne("reason", form).value;
    lord.name("board", form).forEach(function(div) {
        $(".banLevelSelect > input[value='" + level + "']", div).click();
        lord.query("input", div).forEach(function(inp) {
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
    lord.query("select[name^='accessLevel_']", form).forEach(function(sel) {
        sel.selectedIndex = levelInd;
    });
};

lord.clearDate = function(inputName) {
    var inp = lord.queryOne("[name='" + inputName + "']");
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
    $(".banLevelSelect", node).buttonset();
    lord.query("[name='expires'], [name^='banExpires_']", node).forEach(function(inp) {
        $(inp).change(function(){
            $(this).attr("value", $(inp).val());
        });
        $(inp).datetimepicker({
            i18n: { format: "YYYY/MM/DD HH:mm" },
            mask: true,
            value: inp.value
        });
    });
    if (replaced) {
        bans.replaceChild(node, replaced);
    } else {
        var h3 = lord.node("h3");
        h3.appendChild(lord.node("text", (user && (user.ipv4 || user.ip)) || lord.text("newBanText")));
        var empty = lord.queryOne(".bannedUser:not([name])", bans);
        if (empty) {
            bans.insertBefore(node, empty.previousElementSibling);
            bans.insertBefore(h3, node);
        } else {
            bans.appendChild(h3);
            bans.appendChild(node);
        }
    }
    if (lord.hasClass(bans, "ui-accordion"))
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
        var h3 = lord.node("h3");
        h3.appendChild(lord.node("text", (user && user.hashpass) || lord.text("newUserText")));
        var empty = lord.queryOne(".registeredUser:not([name])", div);
        if (empty) {
            div.insertBefore(node, empty.previousElementSibling);
            div.insertBefore(h3, node);
        } else {
            div.appendChild(h3);
            div.appendChild(node);
        }
    }
    if (lord.hasClass(div, "ui-accordion"))
        $(div).accordion("refresh");
    return node;
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.api("bannedUsers").then(function(users) {
        var div = lord.id("bans");
        lord.removeChildren(div);
        lord.removeClass(div, "loadingMessage");
        (users || []).forEach(function(user) {
            lord.createBannedUser(user);
        });
        lord.createBannedUser();
        $(div).accordion({
            collapsible: true,
            heightStyle: "content"
        });
        return lord.api("registeredUsers");
    }).then(function(users) {
        var div = lord.id("users");
        lord.removeChildren(div);
        lord.removeClass(div, "loadingMessage");
        (users || []).forEach(function(user) {
            lord.createRegisteredUser(user);
        });
        lord.createRegisteredUser();
        $(div).accordion({
            collapsible: true,
            heightStyle: "content"
        });
    }).catch(lord.handleError);
}, false);
