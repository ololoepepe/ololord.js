lord.banUser = function(e, form) {
    e.preventDefault();
    var c = {};
    var ip = lord.nameOne("userIp", form).value;
    return lord.post(form.action, new FormData(form)).then(function(result) {
        if (result.errorMessage)
            return Promise.reject(result);
        c.model = lord.model(["base", "tr", "boards"], true);
        return lord.api("bannedUser", { ip: ip });
    }).then(function(model) {
        c.model.settings = lord.settings();
        c.model.bannedUser = model;
        c.model.showSubmitButton = true;
        var parent = lord.id("bannedUsers");
        var previous = lord.id("user" + ip);
        if (c.model.bannedUser) {
            var nodes = $.parseHTML(lord.template("userBan")(c.model));
            var node = (nodes.length > 0) ? nodes[1] : nodes[0];
            if (previous)
                parent.replaceChild(node, previous);
            else
                parent.appendChild(node);
        } else {
            if (previous)
                parent.removeChild(previous);
        }
    }).catch(function(err) {
        console.log(err);
    });
};

lord.bansSelectAll = function(e, btn) {
    e.preventDefault();
    var form = btn.parentNode;
    var levelInd = lord.nameOne("level", form).selectedIndex;
    var expires = lord.nameOne("expires", form).value;
    var reason = lord.nameOne("reason", form).value;
    lord.query("div", form).forEach(function(div) {
        lord.queryOne("select", div).selectedIndex = levelInd;
        lord.query("input", div).forEach(function(inp) {
            if (inp.name.substr(0, 11) == "banExpires_")
                inp.value = expires;
            else if (inp.name.substr(0, 10) == "banReason_")
                inp.value = reason;
        });
    });
};

lord.delall = function(e, form) {
    e.preventDefault();
    return lord.post(form.action, new FormData(form)).then(function(result) {
        if (result.errorMessage)
            return Promise.reject(result);
    }).catch(function(err) {
        console.log(err);
    });
};
