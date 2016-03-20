/*Functions*/

lord.reloadCaptchaFunction = function() {
    var captcha = lord.id("captcha");
    if (!captcha)
        return;
    var image = lord.nameOne("image", captcha);
    var challenge = lord.nameOne("nodeCaptchaChallenge", captcha);
    var response = lord.nameOne("nodeCaptchaResponse", captcha);
    if (!challenge || !response)
        return lord.showPopup("No challenge/response", {type: "critical"});
    response.value = "";
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
    }).catch(function(err) {
        onError(err);
    });
};

lord.reloadCaptchaFunction();
