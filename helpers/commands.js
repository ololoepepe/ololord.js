var ReadLine = require("readline");

var config = require("./config");

var rl = ReadLine.createInterface({
    "input": process.stdin,
    "output": process.stdout
});

var init = function() {
    console.log("Type 'help' for commands");
    rl.on("line", function(line, lineCount, byteCount) {
        switch (line) {
        case "quit":
        case "q":
            process.exit(0);
        case "help":
            console.log("q | quit - Exit the application");
            console.log("help - Print this Help");
            break;
        default:
            break;
        }
        if ("" == line)
            return;
        if (line.indexOf("set ") == 0) {
            var path = line.split(/\s+/)[1];
            var value = line.split(/\s+/).slice(2).join(" ");
            if (!path)
                console.log("Invalid command. Type 'help' for commands");
            if (value) {
                config.set(path, JSON.parse(value));
                console.log("OK");
                return;
            }
            rl.pause();
            rl.question("Enter value for '" + path + "': ", (function(path, answer) {
                config.set(path, JSON.parse(answer));
                console.log("OK");
                rl.resume();
            }).bind(rl, path));
        } else if (line.indexOf("get ") == 0) {
            var path = line.split(/\s+/)[1];
            if (!path)
                console.log("Invalid command. Type 'help' for commands");
            var v = config(path);
            if (undefined == v)
                console.log("No such value");
            else
                console.log("Value for '" + path + "': " + JSON.stringify(v, null, 4));
        } else if (line.indexOf("remove ") == 0) {
            var path = line.split(/\s+/)[1];
            if (!path)
                console.log("Invalid command. Type 'help' for commands");
            config.remove(path);
            console.log("OK");
        } else {
            console.log("Invalid command. Type 'help' for commands");
        }
    }).on("error", function(e) {
        //
    });
    return rl;
};

module.exports = init;
