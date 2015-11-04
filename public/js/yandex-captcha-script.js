/*Functions*/

lord.reloadCaptchaFunction = function() {
    var captcha = lord.id("captcha");
    if (!captcha)
        return lord.showPopup("No captcha", {type: "critical"});
    var image = lord.nameOne("image", captcha);
    var challenge = lord.nameOne("yandexCaptchaChallenge", captcha);
    var response = lord.nameOne("yandexCaptchaResponse", captcha);
    if (!challenge || !response)
        return lord.showPopup("No challenge/response", {type: "critical"});
    response.value = "";
    if (image.firstChild)
        image.removeChild(image.firstChild);
    var type = lord.settings().captchaEngine.id.split("-").pop();
    var onError = function(err) {
        var img = lord.node("img");
        img.src = "/" + lord.data("sitePathPrefix") + "img/yandex-hernya.png";
        img.onclick = lord.reloadCaptchaFunction.bind(lord);
        img.title = err;
        image.appendChild(img);
    };
    lord.getModel("api/yandexCaptchaImage", "type=" + type).then(function(model) {
        if (!model || !model.challenge || !model.url)
            return onError(model ? model.error : "");
        challenge.value = model.challenge;
        var img = lord.node("img");
        img.src = "//" + model.url;
        img.onclick = lord.reloadCaptchaFunction.bind(lord);
        image.appendChild(img);
    }).catch(function(err) {
        onError(err);
    });
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.reloadCaptchaFunction();
}, false);
