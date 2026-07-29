/* eslint-disable max-len */
export default [
  {
    name: 'Utilities',
    basisname: 'utilities',
    showname: 'utilities',
    enabled: true,
    origin: 'homescreen.utilities.folder',
    manifest: {
      icons: {
        '56': '../../style/images/folder_utilities_56.png',
        '112': '../../style/images/folder_utilities_112.png'
      }
    },
    items: [
      {
        name: 'Calculator',
        manifestUrl: window.AppOrigin.getManifestURL('calculator')
      },
      {
        name: 'ToDo',
        manifestUrl: window.AppOrigin.getManifestURL('kaios-todo')
      },
      {
        name: 'Audio Recorder',
        manifestUrl: window.AppOrigin.getManifestURL('soundrecorder')
      }
    ],
    theme: { color: '#f87832' },
    source: 'localfolder'
  },
  {
    name: 'Games',
    basisname: 'games',
    showname: 'games',
    enabled: true,
    origin: 'homescreen.games.folder',
    manifest: {
      icons: {
        '56': '../../style/images/folder_games_56.png',
        '112': '../../style/images/folder_games_112.png'
      }
    },
    items: [
      {
        name: 'Gems',
        origin: window.AppOrigin.getOrigin('kaios-gems')
      },
      {
        name: 'Guardians',
        origin: window.AppOrigin.getOrigin('kaios-guardians')
      },
      {
        name: '2048',
        origin: window.AppOrigin.getOrigin('kaios-2048')
      },
      {
        name: 'Birdy',
        origin: window.AppOrigin.getOrigin('kaios-birdy')
      },
      {
        name: 'Whackamole',
        origin: window.AppOrigin.getOrigin('kaios-whackamole')
      }
    ],
    theme: { color: '#842dff' },
    source: 'localfolder'
  }
];
/* eslint-enable max-len */
