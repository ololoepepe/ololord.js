/*Functions*/

lord.reloadCaptchaFunction = function() {
    var captcha = lord.id("captcha");
    if (!captcha)
        return;
    var image = lord.nameOne("image", captcha);
    var challenge = lord.nameOne("yandexCaptchaChallenge", captcha);
    var response = lord.nameOne("yandexCaptchaResponse", captcha);
    if (!challenge || !response)
        return lord.showPopup("No challenge/response", {type: "critical"});
    response.value = "";
    if (image.firstChild)
        image.removeChild(image.firstChild);
    var onError = function(err) {
        var img = lord.node("img");
        img.src = "/" + lord.data("sitePathPrefix") + "img/yandex-hernya.png";
        img.onclick = lord.reloadCaptchaFunction.bind(lord);
        img.title = err;
        img.style.cursor = "pointer";
        image.appendChild(img);
    };
    lord.api("yandexCaptchaImage", { type: lord.settings().captchaEngine.id.split("-").pop() }).then(function(model) {
        if (!model || !model.challenge || !model.url)
            return onError(model ? model.error : "");
        challenge.value = model.challenge;
        var img = lord.node("img");
        img.src = "//" + model.url;
        img.onclick = lord.reloadCaptchaFunction.bind(lord);
        img.style.cursor = "pointer";
        image.appendChild(img);
    }).catch(function(err) {
        onError(err);
    });
};

lord.reloadCaptchaFunction();
