/*ololord global object*/

var lord = lord || {};

/*Functions*/

lord.banUser = function(btn) {
    if (!btn)
        return;
    var parent = btn.parentNode.parentNode;
    var ip = lord.nameOne("userIp", parent).value;
    if (!ip)
        return;
    var bans = [];
    var anyBanned = false;
    lord.query("div", btn.parentNode).forEach(function(d) {
        var selLevel = lord.queryOne("select", d);
        var b = { "level": +selLevel.options[selLevel.selectedIndex].value };
        if (b.level > 0)
            anyBanned = true;
        lord.query("input", d).forEach(function(inp) {
            if (inp.name.substr(0, 10) == "ban_board_")
                b["boardName"] = inp.value;
            else if (inp.name.substr(0, 12) == "ban_expires_")
                b["expires"] = inp.value;
            else if (inp.name.substr(0, 11) == "ban_reason_")
                b["reason"] = inp.value;
            else
                console.log(inp.name);
        });
        bans.push(b);
    });
    var params = {
        "ip": ip,
        "bans": bans
    };
    lord.ajaxRequest("ban_user", [params], lord.RpcBanUserId, (function(ip, res) {
        var userDiv = lord.id("user" + ip);
        if (anyBanned) {
            lord.ajaxRequest("get_user_ban_info", [ip], lord.RpcGetUserBanInfoId, (function(ip, res) {
                if (!res)
                    return;
                var div = lord.node("div");
                div.setAttribute("id", "user" + ip);
                var div1 = lord.node("div");
                var inpIp = lord.node("input");
                inpIp.type = "text";
                inpIp.setAttribute("name", "userIp");
                inpIp.value = ip;
                inpIp.setAttribute("readonly", true);
                div1.appendChild(inpIp);
                div1.appendChild(lord.node("br"));
                lord.forIn(lord.availableBoards(), function(bt, bn) {
                    var div2 = lord.node("div");
                    lord.addClass(div2, "nowrap");
                    var binp = lord.node("input");
                    binp.type = "hidden";
                    binp.setAttribute("name", "ban_board_" + bn);
                    binp.value = bn;
                    div2.appendChild(binp);
                    div2.appendChild(lord.node("text", "[" + bn + "] " + bt + " "));
                    var selLevel = lord.id("banLevelsSelect").cloneNode(true);
                    selLevel.style.display = "";
                    selLevel.setAttribute("name", "ban_level_" + bn);
                    if (res[bn]) {
                        for (var i = 0; i < selLevel.options.length; ++i) {
                            if (+selLevel.options[i] == res[bn].level) {
                                selLevel.selectedIndex = i;
                                break;
                            }
                        }
                    } else {
                        selLevel.selectedIndex = 0;
                    }
                    div2.appendChild(selLevel);
                    div2.appendChild(lord.node("text", " "));
                    var expires = lord.node("input");
                    expires.type = "text";
                    expires.setAttribute("name", "ban_expires_" + bn);
                    expires.placeholder = lord.text("banExpiresLabelText") + " <dd.MM.yyyy:hh>";
                    expires.size = "23";
                    if (res[bn])
                        expires.value = res[bn].expires;
                    div2.appendChild(expires);
                    div2.appendChild(lord.node("text", " "));
                    var reason = lord.node("input");
                    reason.type = "text";
                    reason.placeholder = lord.text("banReasonLabelText") + " [...]";
                    reason.setAttribute("name", "ban_reason_" + bn);
                    reason.size = "33";
                    if (res[bn])
                        reason.value = res[bn].reason;
                    div2.appendChild(reason);
                    div1.appendChild(div2);
                });
                div1.appendChild(lord.node("br"));
                var btnSel = lord.node("button");
                btnSel.appendChild(lord.node("text", lord.text("selectAllText")));
                btnSel.onclick = lord.bansSelectAll.bind(lord, btnSel);
                div1.appendChild(btnSel);
                div1.appendChild(lord.node("text", " "));
                var selLevel = lord.id("banLevelsSelect").cloneNode(true);
                selLevel.style.display = "";
                selLevel.setAttribute("name", "level");
                selLevel.selectedIndex = 0;
                div1.appendChild(selLevel);
                div1.appendChild(lord.node("text", " "));
                var expires = lord.node("input");
                expires.type = "text";
                expires.setAttribute("name", "expires");
                expires.placeholder = lord.text("banExpiresLabelText") + " <dd.MM.yyyy:hh>";
                expires.size = "23";
                div1.appendChild(expires);
                div1.appendChild(lord.node("text", " "));
                var reason = lord.node("input");
                reason.type = "text";
                reason.placeholder = lord.text("banReasonLabelText") + " [...]";
                reason.setAttribute("name", "reason");
                reason.size = "33";
                div1.appendChild(reason);
                div1.appendChild(lord.node("br"));
                div1.appendChild(lord.node("br"));
                var btn = lord.node("input");
                btn.type = "submit";
                btn.setAttribute("name", "submit");
                btn.value = lord.text("confirmButtonText");
                btn.onclick = lord.banUser.bind(lord, btn);
                div1.appendChild(btn);
                div.appendChild(div1);
                div.appendChild(lord.node("br"));
                var div3 = lord.node("div");
                var selBoards = lord.id("availableBoardsSelect").cloneNode(true);
                selBoards.style.display = "";
                div3.appendChild(selBoards);
                div3.appendChild(lord.node("text", " "));
                var btnDel = lord.node("button");
                btnDel.appendChild(lord.node("text", lord.text("delallButtonText")));
                btnDel.onclick = (function(ip, selBoards) {
                    var bn = selBoards.options[selBoards.selectedIndex].value;
                    lord.ajaxRequest("delall", [ip, bn], lord.RpcBanPosterId);
                }).bind(lord, ip, selBoards);
                div3.appendChild(btnDel);
                div.appendChild(div3);
                div.appendChild(lord.node("br"));
                if (userDiv)
                    userDiv.parentNode.replaceChild(div, userDiv);
                else
                    lord.id("bannedUsers").appendChild(div);
            }).bind(lord, ip));
        } else {
            if (userDiv)
                userDiv.parentNode.removeChild(parent);
        }
    }).bind(lord, ip));
};

lord.bansSelectAll = function(btn) {
    var div1 = btn.parentNode;
    var levelInd = lord.nameOne("level", div1).selectedIndex;
    var expires = lord.nameOne("expires", div1).value;
    var reason = lord.nameOne("reason", div1).value;
    lord.query("div", div1).forEach(function(d) {
        lord.queryOne("select", d).selectedIndex = levelInd;
        lord.query("input", d).forEach(function(inp) {
            if (inp.name.substr(0, 12) == "ban_expires_")
                inp.value = expires;
            else if (inp.name.substr(0, 11) == "ban_reason_")
                inp.value = reason;
        });
    });
};
