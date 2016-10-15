export default require('commander')
.version('2.0.0-alpha3')
.option('-c, --config-file <file>', 'Path to the config.json file')
.option('-r, --rerender', 'Rerender the cache on startup')
.option('-a, --archive', 'Rerender archived threads, too')
.parse(process.argv);
