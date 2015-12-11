window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    var model = lord.model(["base", "tr", "boards"], true);
    model.settings = lord.settings();
    model.compareRegisteredUserLevels = lord.compareRegisteredUserLevels;
    var frameListNavigationPlaceholder = lord.id("frameListNavigationPlaceholder");
    frameListNavigationPlaceholder.parentNode.replaceChild(lord.template("frameListNavigation", model),
        frameListNavigationPlaceholder);
}, false);
