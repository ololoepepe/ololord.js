(function() {
    var captcha = lord.id("captcha");
    var script = lord.node("script");
    script.type = "text/javascript";
    script.src = "http://www.google.com/recaptcha/api/js/recaptcha_ajax.js";
    lord.queryOne("head").appendChild(script);
    script.onload = function() {
        Recaptcha.create(lord.data("publicKey", captcha), "captcha", {
            theme: "clean"
        });
    };
})();
