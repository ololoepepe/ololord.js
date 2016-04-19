/*Functions*/

lord.loginImplementation = function(form, session) {
    form = form || lord.id("loginForm");
    var hashpass = lord.nameOne("hashpass", form).value;
    var realHashpass = !!hashpass;
    if (!hashpass && session)
        hashpass = session.sid;
    if (!hashpass)
        return;
    if (!hashpass.match(/^([0-9a-fA-F]{40})$/))
        hashpass = sha1(hashpass);
    lord.setCookie("hashpass", hashpass, {
        expires: ((session && !realHashpass) ? session.expire : lord.Billion),
        path: "/"
    });
    if (session) {
        lord.setCookie("vkAuth", "true", {
            expires: session.expire,
            path: "/"
        });
    }
    window.location = URI(window.location.href).search(true).source;
};

lord.doLogin = function(event, form) {
    event.preventDefault();
    lord.loginImplementation(form);
};

lord.generateHashpass = function() {
    var form = lord.id("loginForm");
    var hashpass = lord.nameOne("hashpass", form).value;
    lord.prompt({
        title: "hashpassLabelText",
        value: sha1(hashpass),
        style: { minWidth: "350px" },
        readOnly: true
    });
};

lord.vkAuth = function() {
    VK.Auth.login(function(response) {
        if (!response.session)
            return;
        lord.loginImplementation(null, response.session);
    }, VK.access.AUDIO);
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    var vkButton = lord.id("vkontakteLoginButton");
    if (!vkButton)
        return;
    VK.UI.button("vkontakteLoginButton");
    vkButton.style.width = "";
}, false);
