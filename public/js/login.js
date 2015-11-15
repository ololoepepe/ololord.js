/*Functions*/

lord.doLogin = function(event, form) {
    event.preventDefault();
    var hashpass = lord.nameOne("hashpass", form).value;
    if (!hashpass)
        return;
    if (!hashpass.match(/^([0-9a-fA-F]{40})$/))
        hashpass = CryptoJS.SHA1(hashpass).toString(CryptoJS.enc.Hex);
    lord.setCookie("hashpass", hashpass, {
        expires: lord.Billion,
        path: "/"
    });
    window.location = lord.nameOne("source", form).value;
};
