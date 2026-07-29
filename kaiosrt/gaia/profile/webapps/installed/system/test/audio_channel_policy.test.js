import MockAudioChannelController from './mocks/mock_audio_channel_controller';

require('../js/base_module');
global.BaseModule = window.BaseModule;

require('../js/audio_channel_policy');

describe('AudioChannelPolicy', () => {
  let subject;

  test('Initialize the module', (done) => {
    const BaseModule = window.BaseModule;
    subject = BaseModule.instantiate('AudioChannelPolicy');
    expect(subject._isVibrateEnabled).toBe(true);
    done();
  });

    /**
     * Check the policies.
     *
     * @param {Array|Object} audioChannels
     * The audio channels for generating policies.
     * @param {Object} expectedPolicy
     * The policy for the audio channels.
     * @param {Boolean} [isSameApp]
     * If true, the audio channels belong to same app.
     * Otherwise each audio channel belong to different app.
     */
    const checkPolicy = (audioChannels, expectedPolicy, isSameApp) => {
      let appID = 0;

      audioChannels = Array.isArray(audioChannels)
        ? audioChannels
        : [audioChannels];

      expectedPolicy.activeAudioChannels = Array.isArray(expectedPolicy.activeAudioChannels)
        ? expectedPolicy.activeAudioChannels
        : [expectedPolicy.activeAudioChannels];

      audioChannels.map((obj) => {
        const activeAudioChannels = new Map();

        obj.activeAudioChannels = Array.isArray(obj.activeAudioChannels)
          ? obj.activeAudioChannels
          : [obj.activeAudioChannels];

        const newAudioChannel = new MockAudioChannelController(
          { instanceID: appID }, { name: obj.newAudioChannel }
        );

        // Array to map.
        obj.activeAudioChannels.forEach((audioChannel, i) => {
          if (!isSameApp) {
            appID++;
          }
          activeAudioChannels.set(i, new MockAudioChannelController({ instanceID: appID }, { name: audioChannel }));
        });

        return { newAudioChannel, activeAudioChannels };
      }).forEach((obj) => {
        const newAudioChannel = obj.newAudioChannel;
        const activeAudioChannels = obj.activeAudioChannels;
        subject.applyPolicy(newAudioChannel, activeAudioChannels);
        expect(newAudioChannel._policy).toMatchObject(expectedPolicy.newAudioChannel);
        activeAudioChannels.forEach((audioChannel, i) => {
          expect(audioChannel._policy).toMatchObject(expectedPolicy.activeAudioChannels[i]);
        });
      });
    };

    // See: https://bugzilla.kaiostech.com/show_bug.cgi?id=10411#c29
    test('Play telephony and ignore incoming content channel', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'content', activeAudioChannels: 'telephony' }
        ],
        {
          newAudioChannel: { isAllowedToPlay: false, isNeededToResumeWhenOtherEnds: true, isNeededToVibrate: false },
          activeAudioChannels: { isAllowedToPlay: true, isNeededToFadeOut: false }
        }
      );
      done();
    });

    test('Play active and new audio channels', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'normal', activeAudioChannels: 'system' },
          { newAudioChannel: 'normal', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'normal', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'content', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'content', activeAudioChannels: 'system' },
          { newAudioChannel: 'content', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'system' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'notification' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'publicnotification' },
          { newAudioChannel: 'system', activeAudioChannels: 'normal' },
          { newAudioChannel: 'system', activeAudioChannels: 'content' },
          { newAudioChannel: 'system', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'system', activeAudioChannels: 'system' },
          { newAudioChannel: 'system', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'system', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'system', activeAudioChannels: 'notification' },
          { newAudioChannel: 'system', activeAudioChannels: 'publicnotification' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'system' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'notification' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'publicnotification' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'system' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'notification' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'publicnotification' },
          { newAudioChannel: 'notification', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'notification', activeAudioChannels: 'system' },
          { newAudioChannel: 'notification', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'notification', activeAudioChannels: 'notification' },
          { newAudioChannel: 'notification', activeAudioChannels: 'publicnotification' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'system' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'ringer' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'notification' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'publicnotification' }
        ],
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          activeAudioChannels: { isAllowedToPlay: true, isNeededToFadeOut: false }
        }
      );
      done();
    });

    test('Pause active audio channel and play new audio channel', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'normal' },
          { newAudioChannel: 'content', activeAudioChannels: 'normal' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'normal' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'normal' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'normal' }
        ],
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          activeAudioChannels: {
            isAllowedToPlay: false,
            isNeededToVibrate: false,
            isNeededToResumeWhenOtherEnds: false
          }
        }
      );
      done();
    });

    test('Pause alarm and play new audio channel', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'alarm', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'alarm' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'alarm' }
        ],
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          activeAudioChannels: {
            isAllowedToPlay: false,
            isNeededToVibrate: false,
            isNeededToResumeWhenOtherEnds: true
          }
        }
      );
      done();
    });

    test('Pause active audio channel, play new audio channel, and resume the pause audio channel when other ends', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'content' },
          { newAudioChannel: 'content', activeAudioChannels: 'content' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'content' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'content' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'content' }
        ],
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          activeAudioChannels: {
            isAllowedToPlay: false,
            isNeededToVibrate: false,
            isNeededToResumeWhenOtherEnds: true
          }
        }
      );
      done();
    });

    test('Fade out active audio channel', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'notification', activeAudioChannels: 'normal' },
          { newAudioChannel: 'notification', activeAudioChannels: 'content' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'normal' },
          { newAudioChannel: 'publicnotification', activeAudioChannels: 'content' },
        ],
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          activeAudioChannels: { isAllowedToPlay: true, isNeededToFadeOut: true }
        }
      );
      done();
    });

    test('Fade out new audio channel', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'notification' },
          { newAudioChannel: 'normal', activeAudioChannels: 'publicnotification' },
          { newAudioChannel: 'content', activeAudioChannels: 'notification' },
          { newAudioChannel: 'content', activeAudioChannels: 'publicnotification' }
        ],
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: true },
          activeAudioChannels: { isAllowedToPlay: true, isNeededToFadeOut: false }
        }
      );
      done();
    });

    test('Vibrate for active audio channel', (done) => {
      checkPolicy(
        { newAudioChannel: 'ringer', activeAudioChannels: 'ringer' },
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          activeAudioChannels: {
            isAllowedToPlay: false,
            isNeededToVibrate: true,
            isNeededToResumeWhenOtherEnds: true
          }
        }
      );
      done();
    });

    test('Vibrate for new audio channel', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'ringer', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'notification', activeAudioChannels: 'telephony' },
        ],
        {
          newAudioChannel: { isAllowedToPlay: false, isNeededToVibrate: true },
          activeAudioChannels: { isAllowedToPlay: true, isNeededToFadeOut: false }
        }
      );
      done();
    });

    test('Vibrate for new audio channel alarm', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'alarm', activeAudioChannels: 'telephony' },
        ],
        {
          newAudioChannel: { isAllowedToPlay: false, isNeededToResumeWhenOtherEnds: true, isNeededToVibrate: true },
          activeAudioChannels: { isAllowedToPlay: true, isNeededToFadeOut: false }
        }
      );
      done();
    });

    test('Deconflict conflicted policy', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'ringer', activeAudioChannels: ['system', 'telephony', 'publicnotification'] },
          { newAudioChannel: 'notification', activeAudioChannels: ['system', 'telephony', 'publicnotification'] },
        ],
        {
          newAudioChannel: { isAllowedToPlay: false, isNeededToVibrate: true },
          activeAudioChannels: [
            { isAllowedToPlay: true, isNeededToFadeOut: false },
            { isAllowedToPlay: true, isNeededToFadeOut: false },
            { isAllowedToPlay: true, isNeededToFadeOut: false }
          ]
        }
      );
      done();
    });

    test('Deconflict conflicted policy for newAudioChannel alarm', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'alarm', activeAudioChannels: ['system', 'telephony', 'publicnotification'] },
        ],
        {
          newAudioChannel: { isAllowedToPlay: false, isNeededToResumeWhenOtherEnds: true, isNeededToVibrate: true  },
          activeAudioChannels: [
            { isAllowedToPlay: true, isNeededToFadeOut: false },
            { isAllowedToPlay: true, isNeededToFadeOut: false },
            { isAllowedToPlay: true, isNeededToFadeOut: false }
          ]
        }
      );
      done();
    });

    test('All audio channels belong to same app', (done) => {
      checkPolicy(
        [
          { newAudioChannel: 'normal', activeAudioChannels: 'content' },
          { newAudioChannel: 'telephony', activeAudioChannels: 'content' },
          { newAudioChannel: 'alarm', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'ringer', activeAudioChannels: 'telephony' },
          { newAudioChannel: 'notification', activeAudioChannels: 'telephony' },
        ],
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          // Do nothing for active audio channels.
          activeAudioChannels: {}
        },
        // All audio channels belong to same app.
        true
      );

      checkPolicy(
        {
          newAudioChannel: 'normal',
          activeAudioChannels: [
            'content', 'alarm', 'system', 'ringer', 'telephony',
            'notification', 'publicnotification'
          ]
        },
        {
          newAudioChannel: { isAllowedToPlay: true, isNeededToFadeOut: false },
          activeAudioChannels: [{}, {}, {}, {}, {}, {}, {}]
        },
        true
      );
      done();
    });

    test('All audio channel except normal audio channel can play in background', (done) => {
      ['content', 'alarm', 'system', 'ringer', 'telephony',
        'notification', 'publicnotification'].forEach(name => {
        const newAudioChannel = new MockAudioChannelController(
          { instanceID: 'appID' }, { name }
        );
        const activeAudioChannels = new Map();
        subject.applyPolicy(newAudioChannel, activeAudioChannels, { isNewAudioChannelInBackground: true });
        expect(newAudioChannel._policy).toMatchObject({ isAllowedToPlay: true, isNeededToFadeOut: false });
      });
      done();
    });

    test('Observed', (done) => {
      const index = subject.constructor.SETTINGS.indexOf('vibration.enabled');
      expect(index).not.toBe(-1);
      done()
    });

    test('Enabled', (done) => {
      subject['_observe_vibration.enabled'](true);
      expect(subject._isVibrateEnabled).toBe(true);
      done();
    });

    test('Disabled', (done) => {
      subject['_observe_vibration.enabled'](false);
      expect(subject._isVibrateEnabled).toBe(false);
      done();
    });


  test('Fade out new audio channel', (done) => {
    const isNeeded = [
      { activeChannelName: 'notification', newChannelName: 'normal' },
      { activeChannelName: 'notification', newChannelName: 'content' },
      { activeChannelName: 'publicnotification', newChannelName: 'normal' },
      { activeChannelName: 'publicnotification', newChannelName: 'content' }
    ].map(obj => subject._isNeededToFadeOutForNewAudioChannel(
      obj.activeChannelName, obj.newChannelName
    )).every(elem => elem);
    expect(isNeeded).toBe(true);
    done();
  });

  test('Fade out active audio channel', (done) => {
    const isNeeded = [
      { activeChannelName: 'alarm', newChannelName: 'ringer' },
      { activeChannelName: 'alarm', newChannelName: 'telephony' },
      { activeChannelName: 'normal', newChannelName: 'notification' },
      { activeChannelName: 'normal', newChannelName: 'publicnotification' },
      { activeChannelName: 'content', newChannelName: 'notification' },
      { activeChannelName: 'content', newChannelName: 'publicnotification' }
    ].map(obj => subject._isNeededToFadeOutForActiveAudioChannel(
      obj.activeChannelName, obj.newChannelName
    )).every(elem => elem);
    expect(isNeeded).toBe(true);
    done();
  });

  test('Vibrate for active audio channel', (done) => {
    const isNeeded = [
      { activeChannelName: 'ringer', newChannelName: 'ringer' }
    ].map(obj => subject._isNeededToVibrateForActiveAudioChannel(
      obj.activeChannelName, obj.newChannelName
    )).every(elem => elem);
    expect(isNeeded).toBe(true);
    done();
  });

  test('Resume active audio channel when other ends', (done) => {
    const isNeeded = [
      { activeChannelName: 'content', newChannelName: 'content' },
      { activeChannelName: 'content', newChannelName: 'alarm' },
      { activeChannelName: 'content', newChannelName: 'ringer' },
      { activeChannelName: 'content', newChannelName: 'telephony' }
    ].map(obj => subject._isNeededToResumeWhenOtherEndsForActiveAudioChannel(
      obj.activeChannelName, obj.newChannelName
    )).every(elem => elem);
    expect(isNeeded).toBe(true);
    done();
  });
});
