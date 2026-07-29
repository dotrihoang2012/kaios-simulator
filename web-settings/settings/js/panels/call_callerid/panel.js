
define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  /**
   * TaskScheduler helps manage tasks and ensures they are executed in
   * sequential order. When a task of a certain type is enqueued, all pending
   * tasks of the same type in the queue are removed. This avoids redundant
   * queries and improves user perceived performance.
   */
  const TaskScheduler = () => {
    return {
      isLocked: false,
      tasks: [],
      lock() {
        this.isLocked = true;
      },
      unlock() {
        this.isLocked = false;
        this.executeNextTask();
      },
      removeRedundantTasks(type) {
        return this.tasks.filter(task => {
          return task.type !== type;
        });
      },
      executeNextTask() {
        if (this.isLocked) {
          return;
        }
        const nextTask = this.tasks.shift();
        if (nextTask) {
          this.lock();
          nextTask.func(() => {
            this.unlock();
          });
        }
      },
      enqueue(type, func) {
        this.tasks = this.removeRedundantTasks(type);
        this.tasks.push({
          type,
          func
        });
        this.executeNextTask();
      }
    };
  };

  return function callerIdSettingsPanel() {
    let mobileConnection = null;
    let serviceId = 0;
    let taskScheduler = null;
    let elements = null;
    const clirConstantsMapping = {
      CLIR_DEFAULT: 0,
      CLIR_INVOCATION: 1,
      CLIR_SUPPRESSION: 2
    };

    const updateItem = () => {
      updateCallerIdItemState(() => {
        enableTapOnCallerIdItem(true);
      });
    };

    function enableTapOnCallerIdItem(enable) {
      elements.callerIdSelect.disabled = !enable;
      if (enable) {
        elements.callerIdItem.removeAttribute('aria-disabled');
        elements.callerIdItem.classList.remove('none-select');
        SettingsSoftkey.show();
      } else {
        elements.callerIdItem.setAttribute('aria-disabled', 'true');
        elements.callerIdItem.classList.add('none-select');
        SettingsSoftkey.hide();
      }
    }

    function updateCallerIdPreference(callback) {
      taskScheduler.enqueue('CALLER_ID_PREF', done => {
        if (typeof callback !== 'function') {
          callback = () => {
            done();
          };
        } else {
          const originalCallback = callback;
          callback = () => {
            originalCallback();
            done();
          };
        }

        enableTapOnCallerIdItem(false);

        mobileConnection.getCallingLineIdRestriction().then(
          result => {
            let value = 0; // CLIR_DEFAULT
            /*
             * In some legitimates error cases (FdnCheckFailure), the req.result
             * is undefined. This is fine, we want this, and in this case we will
             * just display an error message for all the matching requests.
             */
            if (result) {
              switch (result.m) {
                case 1: // Permanently provisioned
                case 3: // Temporary presentation disallowed
                case 4: // Temporary presentation allowed
                  switch (result.n) {
                    case 1: // CLIR invoked, CLIR_INVOCATION
                    case 2: // CLIR suppressed, CLIR_SUPPRESSION
                    case 0: // Network default, CLIR_DEFAULT
                      value = result.n; // 'CLIR_INVOCATION'
                      break;
                    default:
                      value = 0; // CLIR_DEFAULT
                      break;
                  }
                  enableTapOnCallerIdItem(true);
                  break;
                case 0: // Not Provisioned
                case 2: // Unknown (network error, etc)
                default:
                  value = 0; // CLIR_DEFAULT
                  enableTapOnCallerIdItem(false);
                  break;
              }

              /*
               * Set the Call ID status,
               *   first item value for SIM1 and second item value for SIM2
               */
              SettingsDBCache.getSetting('ril.clirMode').then(dbValue => {
                const preferences = dbValue || [0, 0];
                preferences[serviceId] = value;
                SettingsDBCache.saveSettings({
                  'ril.clirMode': preferences
                });
                callback();
              });
            } else {
              callback();
            }
          },
          err => {
            DebugHelper.debug(`getCallingLineIdRestriction:${err}`);
            callback();
          }
        );
      });
    }
    function updateCallerIdItemState(callback) {
      const element = document.getElementById('menuItem-caller-id');
      if (!element || element.classList.contains('hidden')) {
        if (typeof callback === 'function') {
          callback(null);
        }
        return;
      }

      taskScheduler.enqueue('CALLER_ID', done => {
        SettingsDBCache.getSetting('ril.clirMode').then(dbValue => {
          const preference = (dbValue && dbValue[serviceId]) || 0;
          let value = '';
          switch (preference) {
            case 1: // CLIR invoked
              value = 'CLIR_INVOCATION';
              break;
            case 2: // CLIR suppressed
              value = 'CLIR_SUPPRESSION';
              break;
            case 0: // Network default
            default:
              value = 'CLIR_DEFAULT';
              break;
          }
          elements.callerIdSelect.value = value;
          if (typeof callback === 'function') {
            callback();
          }
          done();
        });
      });
    }

    function checkCallerId(clirMode) {
      SettingsDBCache.getSetting('ril.clirMode').then(value => {
        const preference = (value && value[serviceId]) || 0;
        if (clirMode === preference) {
          ToastHelper.showToast('changessaved');
        }
      });
    }

    function handleChange() {
      const clirMode = clirConstantsMapping[elements.callerIdSelect.value];
      mobileConnection.setCallingLineIdRestriction(clirMode).then(
        () => {
          updateCallerIdPreference();
          checkCallerId(clirMode);
        },
        err => {
          DebugHelper.debug(`setCallingLineIdRestriction: ${err}`);
          updateCallerIdPreference(updateItem);
        }
      );
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          callerIdItem: panel.querySelector('#caller-id-item'),
          callerIdSelect: panel.querySelector('#caller-id-select')
        };
        taskScheduler = TaskScheduler();
        SettingsSoftkey.init(SoftParams.defaultSelect);
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        mobileConnection = ApiManager.connections[serviceId];
        elements.callerIdSelect.addEventListener('change', handleChange);

        updateCallerIdPreference();
        updateCallerIdItemState();
      },
      onBeforeHide() {
        elements.callerIdSelect.removeEventListener('change', handleChange);
      }
    });
  };
});
