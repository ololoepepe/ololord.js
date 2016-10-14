import Board from '../boards/board';
import * as Renderer from '../core/renderer';
import * as IPC from '../helpers/ipc';
import * as Tools from '../helpers/tools';
import * as PostsModel from '../models/posts';
import * as UsersModel from '../models/users';

function formatDate(seconds) {
  let msecs = Math.floor(seconds * Tools.SECOND);
  let days = Math.floor(msecs / Tools.DAY);
  let hours = Math.floor((msecs % Tools.DAY) / Tools.HOUR);
  let minutes = Math.floor((msecs % Tools.HOUR) / Tools.MINUTE);
  seconds = Math.floor((msecs % Tools.MINUTE) / Tools.SECOND);
  return `${days} days ${Tools.pad(hours, 2, '0')}:${Tools.pad(minutes, 2, '0')}:${Tools.pad(seconds, 2, '0')}`;
}

export default [{
  command: 'quit',
  handler: function() {
    process.exit(0);
    return 'OK';
  },
  options: {
    description: Tools.translate('Quits the application.'),
    alias: ['exit', 'q']
  }
}, {
  command: 'respawn [exitCode]',
  handler: async function({ exitCode } = {}) {
    await IPC.send('exit', Tools.option(exitCode, 'number', 0), true);
    return 'OK';
  },
  options: { description: Tools.translate('Respawns worker processes with the passed exit code.') }
}, {
  command: 'add-superuser',
  handler: async function() {
    let { password, notHashpass } = await this.requestPassword();
    let { input } = await this.prompt(Tools.translate('Enter superuser IP list (separate by spaces): '));
    let ips = Tools.ipList(input);
    if (typeof ips === 'string') {
      throw new Error(ips);
    }
    let hashpass = Tools.toHashpass(password, notHashpass);
    await UsersModel.addSuperuser(hashpass, ips);
    return 'OK';
  },
  options: { description: Tools.translate('Registers a superuser.') }
}, {
  command: 'remove-superuser',
  handler: async function() {
    let { password, notHashpass } = await this.requestPassword();
    let hashpass = Tools.toHashpass(password, notHashpass);
    await UsersModel.removeSuperuser(hashpass);
    return 'OK';
  },
  options: { description: Tools.translate('Unregisters a superuser.') }
}, {
  command: 'markup-posts [targets...]',
  handler: async function({ targets } = {}) {
    let result = await this.prompt({
      type: 'confirm',
      name: 'markup',
      default: true,
      message: Tools.translate('Are you sure? ')
    });
    if (!result.markup) {
      return;
    }
    await PostsModel.markupPosts(Renderer.targetsFromString((targets || []).join(' ')));
    //TODO: Rerender corresponding pages?
    return 'OK';
  },
  options: {
    description: Tools.translate('Rerenders text of posts specified as $[1].\n'
      + 'If $[1] is omitted, rerenders text of all posts on all boards.\n'
      + 'Each target is a string in the following form:\n'
      + '$[2]', '', '[targets...]', '<board name>[:<post number>[:...]]')
  }
}, {
  command: 'stop',
  handler: async function() {
    await IPC.send('stop');
    return 'OK';
  },
  options: { description: Tools.translate('Closes all workers, preventing incoming connections.') }
}, {
  command: 'start',
  handler: async function() {
    await IPC.send('start');
    return 'OK';
  },
  options: { description: Tools.translate('Opens workers for connections if closed.') }
}, {
  command: 'rerender [what...]',
  handler: async function({ options, what } = {}) {
    let timeStart = new Date();
    let { list, archive } = options || {};
    if (list) {
      let paths = await Renderer.getRouterPaths(true);
      return paths.map((path) => {
        return (typeof path === 'object') ? `${path.path} ${path.description}` : path;
      }).join('\n');
    } else {
      if (what) {
        await Renderer.rerender(what);
      } else if (archive) {
        await Renderer.rerender();
      } else {
        await Renderer.rerender(['**', '!/*/arch/*']);
      }
      return `OK (${new Date() - timeStart}ms)`;
    }
  },
  options: {
    description: Tools.translate("Rerenders the cache."),
    options: [{
      value: '-a, --archive',
      description: Tools.translate('Rerender archived threads (if no pattern is specified).')
    }, {
      value: '-l, --list',
      description: Tools.translate('Only list available router paths. No rerender.')
    }]
  }
}, {
  command: 'reload-boards',
  handler: async function() {
    Board.initialize();
    await IPC.send('reloadBoards');
    return 'OK';
  },
  options: { description: Tools.translate('Reloads the boards.') }
}, {
  command: 'reload-templates',
  handler: async function(args) {
    await Renderer.compileTemplates();
    await Renderer.reloadTemplates();
    await IPC.send('reloadTemplates');
    return 'OK';
  },
  options: { description: Tools.translate('Reloads the templates and the partials (including public ones).') }
}, {
  command: 'uptime',
  handler: function() {
    return formatDate(process.uptime());
  },
  options: { description: Tools.translate('Shows server uptime.') }
}];
