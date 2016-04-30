/*Functions*/

lord.reloadCaptchaFunction = function() {
    var captcha = lord.id("captcha");
    if (!captcha)
        return;
    if (lord.captchaCountdownTimer) {
        clearInterval(lord.captchaCountdownTimer);
        delete lord.captchaCountdownTimer;
    }
    var image = lord.nameOne("image", captcha);
    var challenge = lord.nameOne("nodeCaptchaChallenge", captcha);
    var response = lord.nameOne("nodeCaptchaResponse", captcha);
    if (!challenge || !response)
        return lord.showPopup("No challenge/response", {type: "critical"});
    var countdown = lord.nameOne("countdown", captcha);
    response.value = "";
    $(countdown).empty();
    if (image.firstChild)
        image.removeChild(image.firstChild);
    var onError = function(err) {
        var img = lord.node("img");
        img.src = "/" + lord.data("sitePathPrefix") + "img/node-captcha-fail.png";
        img.onclick = lord.reloadCaptchaFunction.bind(lord);
        img.title = err;
        img.style.cursor = "pointer";
        image.appendChild(img);
    };
    lord.api("nodeCaptchaImage", {}).then(function(model) {
        if (!model || !model.challenge || !model.fileName)
            return onError(model ? model.error : "");
        challenge.value = model.challenge;
        var img = lord.node("img");
        img.src = "/" + lord.data("sitePathPrefix") + "node-captcha/" + model.fileName;
        img.onclick = lord.reloadCaptchaFunction.bind(lord);
        img.style.cursor = "pointer";
        image.appendChild(img);
        setTimeout(lord.reloadCaptchaFunction.bind(lord), model.ttl);
        var formatTime = function(seconds) {
            var pad = function(s) {
                return (s < 10 ? "0" : "") + s;
            };
            var hours = Math.floor(seconds % (24 * 60 * 60) / (60 * 60));
            var minutes = Math.floor(seconds % (60 * 60) / 60);
            var seconds = Math.floor(seconds % 60);
            return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
        };
        var seconds = model.ttl / lord.Second;
        countdown.appendChild(lord.node("text", formatTime(seconds)));
        lord.captchaCountdownTimer = setInterval(function() {
            --seconds;
            $(countdown).empty();
            countdown.appendChild(lord.node("text", formatTime(seconds)));
        }, lord.Second);
    }).catch(function(err) {
        onError(err);
    });
};

lord.reloadCaptchaFunction();
