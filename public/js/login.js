/*Functions*/

lord.loginImplementation = function(form) {
    form = form || lord.id("loginForm");
    var hashpass = lord.nameOne("hashpass", form).value;
    if (!hashpass)
        return;
    if (!hashpass.match(/^([0-9a-fA-F]{40})$/))
        hashpass = CryptoJS.SHA1(hashpass).toString(CryptoJS.enc.Hex);
};

lord.doLogin = function(event, form) {
    event.preventDefault();
    lord.loginImplementation(form);
};

lord.vkAuth = function() {
    VK.Auth.login(function(response) {
        if (!response.session)
            return;
        console.log(response);
        lord.loginImplementation();
    });
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    var vkButton = lord.id("vkontakteLoginButton");
    if (!vkButton)
        return;
    VK.UI.button("vkontakteLoginButton");
}, false);
