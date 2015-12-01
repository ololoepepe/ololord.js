lord.codecha = {};

lord.codecha.mustRequestNewChallenge = false;

lord.codecha.textAreaKeyPress = function(e) {
    var object = lord.id("codecha_code_area");
    if (e.keyCode == 9) {
        start = object.selectionStart;
        end = object.selectionEnd;
        object.value = object.value.substring(0, start) + "\t" + object.value.substr(end);
        object.setSelectionRange(start + 1, start + 1);
        object.selectionStart = object.selectionEnd = start + 1;
        return false;
    }
    return true;
};

lord.codecha.serialize = function(obj) {
    var array = [];
    for (key in obj)
        array[array.length] = encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]);
    var result = array.join("&");
    result = result.replace(/%20/g, "+");
    return result;
};

lord.codecha.escape = function(str) {
    var div = lord.node("div");
    div.appendChild(lord.node("text", str));
    return div.innerHTML;
};

lord.codecha.enable = function() {
    lord.id("codecha_code_submit_button").disabled = false;
    lord.id("codecha_change_challenge").disabled = false;
    lord.id("codecha_code_area").disabled = false;
    lord.id("codecha_spinner").hidden = true;
};

lord.codecha.disable = function() {
    lord.id("codecha_code_submit_button").disabled = true;
    lord.id("codecha_change_challenge").disabled = true;
    lord.id("codecha_code_area").disabled = true;
    lord.id("codecha_spinner").hidden = false;
};

lord.codecha.hideErrorOverlay = function() {
    lord.id("codecha_error_overlay").hidden = true;
}

lord.codecha.setStatus = function(state) {
    lord.id("codecha_status").innerHTML = state;
};

lord.codecha.updateState = function() {
    lord.post("//codecha.org/api/state",
        lord.codecha.serialize({ 'challenge': lord.id("codecha_challenge_field").value })).then(function(response) {
        var match = /codecha\.response\s*\=\s"([^"]+)"/gi.exec(response);
        if (match) {
            lord.codecha.mustRequestNewChallenge = true;
            lord.id("codecha_response_field").value = match[1];
            lord.id("codecha_widget").style.display = "none";
            lord.id("codecha_ready_widget").style.display = "";
        } else {
            var codecha = lord.codecha;
            eval(response.replace(".callbacks", ""));
        }
    }).catch(function(err) {
        console.log(err);
    });
};

lord.codecha.showErrorMessage = function(message) {
    lord.id("codecha_error_message").innerHTML = message;
    lord.id("codecha_error_overlay").hidden = false;
};

lord.codecha.setChallenge = function(uuid, langName, wording, top, sampleCode, bottom) {
    lord.id("codecha_challenge_field").value = uuid;
    lord.id("codecha_wording").innerHTML = "<strong>" + langName + ":</strong> " + wording;
    lord.id("codecha_code_area_top").innerHTML = "<pre>\n"+this.escape(top)+"</pre>";
    lord.id("codecha_code_area").value = sampleCode;
    lord.id("codecha_code_area_bottom").innerHTML = lord.codecha.escape(bottom);
    lord.id("codecha_code_area_top").hidden = (top.length <= 0);
    lord.id("codecha_code_area_bottom").hidden = (bottom.length <= 0);
};

lord.codecha.choseLanguage = function() {
    lord.id("codecha_language_selector").hidden = false;
    lord.id("codecha_language_selector").style.display = "";
    lord.id("codecha_change_challenge").value = "\u2713";
    lord.id("codecha_code_submit_button").disabled = true;
    lord.id("codecha_change_challenge").onclick = lord.codecha.requestNewChallenge;
    return false;
};

lord.codecha.requestNewChallenge = function() {
    lord.codecha.disable();
    lord.codecha.setStatus("waiting");
    var select = lord.id("codecha_language_selector");
    select.hidden = true;
    select.style.display = "none";
    lord.id("codecha_change_challenge").value = "change lang";
    lord.id("codecha_change_challenge").onclick = lord.codecha.choseLanguage;
    lord.id("codecha_response_field").value = "";
    var p;
    if (!lord.codecha.mustRequestNewChallenge) {
        p = Promise.resolve();
    } else {
        p = Promise.resolve().then(function() {
            return lord.api("codechaChallenge");
        }).then(function(model) {
            lord.codecha.mustRequestNewChallenge = false;
            lord.id("codecha_challenge_field").value = model;
            return Promise.resolve();
        });
    }
    p.then(function() {
        var params = {
            "challenge": lord.id("codecha_challenge_field").value,
            "k": lord.id("codecha_public_key").value,
            "lang": select.options[select.selectedIndex].value
        };
        return lord.post("//codecha.org/api/change", lord.codecha.serialize(params));
    }).then(function(response) {
        var codecha = lord.codecha;
        eval(response);
    }).catch(function(err) {
        console.log(err);
    });
    return false;
};

lord.codecha.codeSubmit = function() {
    lord.codecha.disable();
    var params = {
        "challenge": lord.id("codecha_challenge_field").value,
        "code": lord.id("codecha_code_area").value
    };
    lord.post("//codecha.org/api/code", lord.codecha.serialize(params)).then(function(response) {
        lord.codecha.setStatus("sending");
        setTimeout(lord.codecha.updateState, 1000);
    }).catch(function(err) {
        console.log(err);
    });
};

(function() {
    var link = lord.node("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("href", "//codecha.org/static/widget.css");
    lord.queryOne("head").appendChild(link);

})();

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.codecha.disable();
    lord.codecha.requestNewChallenge();
}, false);

lord.reloadCaptchaFunction = function() {
    lord.codecha.requestNewChallenge();
    lord.id("codecha_widget").style.display = "";
    lord.id("codecha_ready_widget").style.display = "none";
};
