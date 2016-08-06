export default require('commander')
.version('2.0.0-pa')
.option('-c, --config-file <file>', 'Path to the config.json file')
.option('-r, --regenerate', 'Regenerate the cache on startup')
.option('-a, --archive', 'Regenerate archived threads, too')
.parse(process.argv);
