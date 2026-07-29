/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* Vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
 * This file is in charge of rendering & update the list of downloads.
 */
/* global
  DownloadApiManager,
  MimeMapper,
  DownloadFormatter,
  DownloadUI,
  DownloadItem,
  DownloadHelper,
  MenuMap
  */

// eslint-disable-next-line
define(['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');

  return function ctorDownload() {
    let elements = {};

    /*
     * Menus
     * const downloadsEditMenu = null;
     */

    /*
     * Buttons
     * const editButton = null;
     * const deleteButton = null;
     * const selectAllButton = null;
     * const deselectAllButton = null;
     */

    // Not related with DOM vars
    let isEditMode = false;
    let numberOfDownloads = 0;
    let numberOfCheckedDownloads = 0;

    // Const optionsShow = false;
    let deleteCount = 0;
    const resumeClick = {};
    let isMutilDelEditMode = false;

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          downloadsContainer: panel.querySelector('#downloadList ul'),
          emptyDownloadsContainer: panel.querySelector('#download-list-empty'),
          downloadsPanel: panel,
          selectnumber: panel.querySelector('.selectnumber')
        };

        const emptyChild = elements.emptyDownloadsContainer.firstElementChild;
        emptyChild.setAttribute('data-l10n-id', 'no-downloads-text');

        this.initSoftkey();

        const scripts = [
          // Only download use gaia-progress, so move it here
          `${Constants.SHARD_ORIGIN}/elements/gaia_progress/gaia_progress.js`,
          `${Constants.SHARD_ORIGIN}/js/utils/l10n/l10n_date.js`,
          'js/panels/downloads/download_formatter.js',
          'js/panels/downloads/download_api_manager.js',
          'js/panels/downloads/download_item.js',
          'js/panels/downloads/downloads_ui.js',
          'js/panels/downloads/download_helper.js'
          // 'shared/js/l10n_date.js'
        ];

        if (!navigator.b2g.downloadManager) {
          scripts.push('js/panels/downloads/desktop/desktop_moz_downloads.js');
        }

        LazyLoader.load(scripts, () => {
          /*
           * DownloadsContainer = document.querySelector('#downloadList ul');
           * Localization of the nodes for avoiding weird repaintings
           * var noDownloadsTextEl = document.getElementById('dle-text');
           * var editModeTitle = document.getElementById('downloads-title-edit');
           */
          DownloadApiManager.init();
          DownloadApiManager.setListener(
            this.downloadApiManagerListener.bind(this)
          );
          DownloadApiManager.getDownloads(
            this.renderForDownload.bind(this),
            this.errorForDownload.bind(this)
          );
          // Update method added
          DownloadApiManager.setOnDownloadHandler(this.newDownload.bind(this));
        });

        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleFocusChanged = this.handleFocusChanged.bind(this);
      },

      onBeforeShow() {
        if (window.DownloadApiManager && window.DownloadItem) {
          DownloadApiManager.getDownloads(
            this.renderForDownload.bind(this),
            this.errorForDownload.bind(this)
          );
        }
        window.addEventListener('keydown', this.handleKeydown, true);
        document.addEventListener('focusChanged', this.handleFocusChanged);
      },

      onBeforeHide() {
        window.removeEventListener('keydown', this.handleKeydown, true);
        document.removeEventListener('focusChanged', this.handleFocusChanged);
      },

      initSoftkey() {
        // Add all the soft key
        const skWallpaper = {
          name: 'Set as Wallpaper',
          l10nId: 'set-as-wallpaper',
          priority: 5,
          method: () => {
            this.thirdAppDoDownloadActions('wallpaper');
          }
        };
        const skShare = {
          name: 'Share',
          l10nId: 'share',
          priority: 5,
          method: () => {
            this.thirdAppDoDownloadActions('share');
          }
        };
        const skSelMulti = {
          name: 'Multiple Select',
          l10nId: 'multiple-select',
          priority: 5,
          method: () => {
            this.enterMultDelMode();
          }
        };
        const skDelete = {
          name: 'Delete',
          l10nId: 'delete',
          priority: 5,
          method: () => {
            this.optionDelSingleDownload();
          }
        };
        const skRingtone = {
          name: 'Set as Ringtone',
          l10nId: 'set-as-ringtone',
          priority: 5,
          method: () => {
            this.thirdAppDoDownloadActions('ringtone');
          }
        };
        const skCOpen = {
          name: 'Open',
          l10nId: 'download-open',
          priority: 2,
          method: () => {
            this.thirdAppDoDownloadActions('open');
          }
        };
        const skCStop = {
          name: 'Stop',
          l10nId: '',
          icon: 'stop',
          priority: 2,
          method: () => {
            this.softDownloadHandler('stop');
          }
        };
        const skCResume = {
          name: 'Resume',
          l10nId: '',
          icon: 'file-download-01',
          priority: 2,
          method: () => {
            this.softDownloadHandler('resume');
          }
        };
        const skCRetry = {
          name: 'Retry',
          l10nId: 'download-retry',
          priority: 2,
          method: () => {
            this.softDownloadHandler();
          }
        };
        const skLSelAll = {
          name: 'Select All',
          l10nId: 'selectall',
          priority: 1,
          method: () => {
            this.selectAllSoftKeyhandler();
          }
        };
        const skLDelete = {
          name: 'Delete',
          l10nId: 'delete',
          priority: 3,
          method: () => {
            this.deleteSoftKeyhandler();
          }
        };
        const skLDeSele = {
          name: 'Deselect All',
          l10nId: 'deselectnone',
          priority: 1,
          method: () => {
            this.deSelectAllSoftKeyhandler();
          }
        };

        const skCSelect = {
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method: () => {}
        };

        const skDeSelect = {
          name: 'Deselect',
          l10nId: 'deselect',
          priority: 2,
          method: () => {}
        };

        const skLCancel = {
          name: '',
          l10nId: '',
          priority: 1,
          method: () => {}
        };

        elements.noDownloadsSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skLCancel]
        };

        elements.succeeMusicSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCOpen, skShare, skRingtone, skSelMulti, skDelete]
        };
        elements.succeeMusicSoftKeyBarForLite = {
          header: {
            l10nId: 'options'
          },
          items: [skCOpen, skShare, skSelMulti, skDelete]
        };
        elements.succeeWallpaperSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCOpen, skShare, skWallpaper, skSelMulti, skDelete]
        };
        elements.succeeNosupportSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCOpen, skShare, skSelMulti, skDelete]
        };
        elements.downloadingMusicSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCStop, skShare, skRingtone, skSelMulti, skDelete]
        };
        elements.downloadingMusicSoftKeyBarForLite = {
          header: {
            l10nId: 'options'
          },
          items: [skCStop, skShare, skSelMulti, skDelete]
        };
        elements.downloadingWallpaperSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCStop, skShare, skWallpaper, skSelMulti, skDelete]
        };
        elements.downloadingNosupportSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCStop, skShare, skSelMulti, skDelete]
        };
        elements.stoppedMusicSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCResume, skShare, skRingtone, skSelMulti, skDelete]
        };
        elements.stoppedMusicSoftKeyBarForLite = {
          header: {
            l10nId: 'options'
          },
          items: [skCResume, skShare, skSelMulti, skDelete]
        };
        elements.stoppedWallpaperSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCResume, skShare, skWallpaper, skSelMulti, skDelete]
        };
        elements.stoppedNosupportSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCResume, skShare, skSelMulti, skDelete]
        };
        elements.failedMusicSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCRetry, skShare, skRingtone, skSelMulti, skDelete]
        };
        elements.failedMusicSoftKeyBarForLite = {
          header: {
            l10nId: 'options'
          },
          items: [skCRetry, skShare, skSelMulti, skDelete]
        };
        elements.failedWallpaperSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCRetry, skShare, skWallpaper, skSelMulti, skDelete]
        };
        elements.failedNosupportSoftKeyBar = {
          header: {
            l10nId: 'options'
          },
          items: [skCRetry, skShare, skSelMulti, skDelete]
        };
        elements.editSoftKeyBar1 = {
          header: {
            l10nId: 'options'
          },
          items: [skLSelAll, skCSelect]
        };
        elements.editSoftKeyBar2 = {
          header: {
            l10nId: 'options'
          },
          items: [skLSelAll, skCSelect, skLDelete]
        };
        elements.editSoftKeyBar3 = {
          header: {
            l10nId: 'options'
          },
          items: [skLDeSele, skCSelect, skLDelete]
        };
        elements.editSoftKeyBar4 = {
          header: {
            l10nId: 'options'
          },
          items: [skLSelAll, skDeSelect, skLDelete]
        };
        elements.editSoftKeyBar5 = {
          header: {
            l10nId: 'options'
          },
          items: [skLDeSele, skDeSelect, skLDelete]
        };
      },

      thirdAppDoDownloadActions(name) {
        let focusedElement = document.querySelector('#downloads .focus1');
        if (focusedElement === null) {
          focusedElement = document.querySelector('#downloads .focus');
        }
        const downloadID = focusedElement.id;
        const download = DownloadApiManager.getDownload(downloadID);
        // SettingsSoftkey.hide();
        const req = DownloadHelper[name](download);
        req.onerror = () => {
          DownloadHelper.handlerError(req.error, download, d => {
            if (!d) {
              return;
            }
            // If error when opening, we need to delete it!
            const downloadId = DownloadItem.getDownloadId(d);
            const elementToDelete = this.getElementForId(downloadId);
            DownloadApiManager.deleteDownloads(
              [
                {
                  id: downloadId,
                  force: true // Deleting download without confirmation
                }
              ],
              () => {
                this.removeDownloadsFromUI([elementToDelete], 1);
                this.checkEmptyList();
              },
              () => {
                console.warn('Download not removed during launching');
              }
            );
          });
        };
        req.onsuccess = result => {
          if (
            name === 'open' &&
            result.target.result &&
            result.target.result.deleteFile
          ) {
            const deleteItem = this.getElementForId(downloadID);
            DownloadApiManager.deleteDownloads(
              [
                {
                  id: downloadID,
                  force: true // Deleting download without confirmation
                }
              ],
              () => {
                this.removeDownloadsFromUI([deleteItem], 1);
                this.checkEmptyList();
              },
              () => {
                console.warn('Download not removed during launching');
              }
            );
          }
        };
      },

      removeDownloadsFromUI(items, total) {
        for (let i = 0; i < items.length; i++) {
          elements.downloadsContainer.removeChild(items[i]);
        }
        NavigationMap.refresh();
        numberOfCheckedDownloads = 0;
        deleteCount++;
        if (deleteCount === total) {
          deleteCount = 0;
          this.showDeleteToaster(items, total);
        }
      },

      showDeleteToaster(items, total) {
        const isEmpty = elements.downloadsContainer.children.length === 0;
        const option = {
          messageL10nId: null,
          messageL10nArgs: null,
          message: null,
          latency: 3000,
          useTransition: true
        };
        SettingsSoftkey.hide();
        if (total > 1) {
          option.messageL10nId = 'downloads-deleted';
          option.messageL10nArgs = { n: total };
        } else {
          const { fileName } = items[0].childNodes[1].children[2].dataset;
          option.messageL10nId = 'downloads-file-deleted';
          option.messageL10nArgs = { filename: fileName };
        }
        ToastHelper.showToast(option.messageL10nId, option.messageL10nArgs);
        setTimeout(() => {
          if (isEmpty === false) SettingsSoftkey.show();
        }, 3000);
      },

      // To select mutile download forme the option menue
      enterMultDelMode() {
        this.loadEditMode();
      },

      loadEditMode() {
        // Disable all checks
        this.disableAllChecks();

        // Add 'edit' stype
        elements.downloadsPanel.classList.add('edit');
        // DownloadsEditMenu.hidden = false;

        // Change edit mdoe status
        isEditMode = true;
        this.updateButtonsStatus();

        l10n.setAttributes(elements.selectnumber, 'downloads-selected', {
          n: numberOfCheckedDownloads
        });
      },

      handleFocusChanged() {
        this.changeProgressFocus();
        if (isEditMode) {
          this.updateButtonsStatus();
        } else if (!MenuMap.optionsShow) {
          this.checkShowSoftKey();
        }
      },

      disableAllChecks() {
        this.markAllChecksAs(false);
        this.updateButtonsStatus();
      },

      enableAllChecks() {
        this.markAllChecksAs(true);
        this.updateButtonsStatus();
      },

      getAllChecks() {
        return elements.downloadsContainer.querySelectorAll('input');
      },

      markAllChecksAs(condition) {
        const checks = this.getAllChecks();
        for (let i = 0; i < checks.length; i++) {
          checks[i].checked = condition;
        }
        numberOfCheckedDownloads = condition ? numberOfDownloads : 0;
      },

      updateButtonsStatus() {
        if (numberOfDownloads === 0) {
          // Cache number of downloads
          numberOfDownloads = this.getAllChecks().length;
        }

        const focusItem = elements.downloadsContainer.querySelector(
          '.focus input:checked'
        );
        const focusChecked = focusItem ? focusItem.checked : false;

        /*
         * Delete button status
         *deleteButton.disabled = !(numberOfCheckedDownloads > 0);
         */
        if (0 === numberOfCheckedDownloads) {
          SettingsSoftkey.init(elements.editSoftKeyBar1);
          SettingsSoftkey.show();
        } else if (
          numberOfCheckedDownloads > 0 &&
          numberOfCheckedDownloads < numberOfDownloads
        ) {
          SettingsSoftkey.init(
            focusChecked ? elements.editSoftKeyBar4 : elements.editSoftKeyBar2
          );
          SettingsSoftkey.show();
        } else if (numberOfCheckedDownloads === numberOfDownloads) {
          SettingsSoftkey.init(elements.editSoftKeyBar5);
        }

        /*
         * 'Select all' button status
         *selectAllButton.disabled = (numberOfCheckedDownloads === numberOfDownloads);
         * Nothing checked?
         *deselectAllButton.disabled = (numberOfCheckedDownloads === 0);
         */
      },

      // To pause stop resume the downloads
      softDownloadHandler(actionString) {
        const focusedElement = document.querySelector('#downloads .focus');
        const downloadID = focusedElement.id;
        const download = DownloadApiManager.getDownload(downloadID);
        this.actionHandler(download, actionString);
        this.checkShowSoftKey();
      },

      // To delete one download frome the option menue
      optionDelSingleDownload() {
        // Var downloadsChecked = _getAllChecked() || [];
        let focusedElement = document.querySelector('#downloads .focus');
        if (!focusedElement) {
          focusedElement = document.querySelector('#downloads .focus1');
        }
        const focusedNext = focusedElement.nextSibling;
        const downloadID = focusedElement.id;
        // Const download = DownloadApiManager.getDownload(downloadID);
        const downloadItems = [];
        const downloadElements = {};
        downloadItems.push({
          id: downloadID,
          force: false
        });
        downloadElements[downloadID] = focusedElement;

        const deletionDone = () => {
          this.checkEmptyList();
        };

        const doDeleteDownloads = () => {
          DownloadApiManager.deleteDownloads(
            downloadItems,
            // eslint-disable-next-line
            downloadID => {
              this.removeDownloadsFromUI([downloadElements[downloadID]], 1);
            },
            // eslint-disable-next-line
            (downloadID, msg) => {
              console.warn(`Could not delete ${downloadID} : ${msg}`);
              deletionDone();
            },
            () => {
              if (focusedNext) {
                this.handleChangeFocus(focusedNext);
              }
              deletionDone();
            }
          );
        };
        doDeleteDownloads();
      },

      handleChangeFocus(focusNode) {
        const focused = elements.downloadsPanel.querySelectorAll('.focus');
        if (focused.length > 0) {
          focused[0].classList.remove('focus');
        }

        focusNode.classList.add('focus');
        focusNode.focus();
        this.checkShowSoftKey();
        setTimeout(() => {
          focusNode.scrollIntoView(false);
        }, 0);
      },

      checkEmptyList() {
        if (!elements.downloadsContainer) {
          return;
        }
        const isEmpty = elements.downloadsContainer.children.length === 0;

        if (isEmpty) {
          elements.downloadsContainer.classList.add('hidden');
          elements.emptyDownloadsContainer.classList.remove('hidden');
          isEditMode = false;
          SettingsSoftkey.init(elements.noDownloadsSoftKeyBar);
          SettingsSoftkey.show();
        } else {
          elements.downloadsContainer.classList.remove('hidden');
          elements.emptyDownloadsContainer.classList.add('hidden');
        }
        // EditButton.disabled = isEmpty;
      },

      actionHandler(download, actionString) {
        if (!download) {
          console.error('Download not retrieved properly');
          return;
        }

        switch (download.state) {
          case 'downloading':
            // Downloading -> paused
            this.pauseDownload(download);
            break;
          case 'stopped':
            if (actionString === 'stop') {
              this.pauseDownload(download);
            } else {
              this.restartDownload(download);
            }
            break;
          case 'finalized':
          case 'succeeded':
            /*
             * Launch an app to view the download
             *_showDownloadActions(download);
             */
            break;
          default:
            break;
        }
      },

      pauseDownload(download) {
        const request = DownloadUI.show(DownloadUI.TYPE.STOP, download);

        request.onconfirm = () => {
          if (download.pause) {
            download.pause().then(
              () => {
                /*
                 * We don't remove the listener because the download could be
                 * Restarted in notification tray
                 */
                this.updateForDownload(download, true);
                this.checkShowSoftKey();
                ToastHelper.showToast('downloading-stopped');
              },
              () => {
                console.error('Could not pause the download');
              }
            );
          }
        };
      },

      restartDownload(download) {
        /*
         * DownloadUI knows which will be the correct confirm depending on state
         * and error attributes
         */
        const request = DownloadUI.show(DownloadUI.TYPE.STOPPED, download);
        resumeClick[DownloadItem.getDownloadId(download)] = true;
        request.onconfirm = () => {
          if (download.resume) {
            download.resume().then(
              () => {
                /*
                 * Nothing to do here -> this resolves only once the download has
                 * succeeded.
                 * _showResumeToaster();
                 */
              },
              () => {
                // This error is fired when a download restarted is paused
                console.error(l10n.get('restart_download_error'));
              }
            );
          }
        };
      },

      // Do download action at the edid mode frome the softkey
      selectAllSoftKeyhandler() {
        this.enableAllChecks();
        this.onAllDownloadSelected();
      },

      deSelectAllSoftKeyhandler() {
        this.disableAllChecks();
        this.onAllDownloadSelected();
      },

      deleteSoftKeyhandler() {
        this.deleteDownloads();
      },

      onAllDownloadSelected() {
        if (isEditMode) {
          const focusedElement = document.querySelector('#downloads .focus');
          // eslint-disable-next-line
          const input = focusedElement.childNodes[0].childNodes[0];
          if (typeof input === 'undefined') {
            return;
          }
          const { checked } = input;
          if (checked === false) {
            numberOfCheckedDownloads = 0;
          } else {
            numberOfCheckedDownloads =
              elements.downloadsContainer.children.length;
          }
          l10n.setAttributes(elements.selectnumber, 'downloads-selected', {
            n: numberOfCheckedDownloads
          });
          this.updateButtonsStatus();
        }
      },

      getAllChecked() {
        return elements.downloadsContainer.querySelectorAll('input:checked');
      },

      deleteDownloads() {
        const downloadsChecked = this.getAllChecked() || [];
        const downloadItems = [];
        const downloadElements = {};
        const downloadList = [];
        const total = downloadsChecked.length;
        const multipleDelete = total > 1;
        // SettingsSoftkey.hide();
        for (let i = 0; i < total; i++) {
          downloadItems.push({
            id: downloadsChecked[i].value,
            force: multipleDelete
          });
          downloadElements[downloadsChecked[i].value] =
            downloadsChecked[i].parentNode.parentNode;
          if (multipleDelete) {
            downloadList.push(downloadElements[downloadsChecked[i].value]);
          }
        }

        const deletionDone = () => {
          this.checkEmptyList();
          this.closeEditMode();
        };

        const doDeleteDownloads = () => {
          DownloadApiManager.deleteDownloads(
            downloadItems,
            downloadID => {
              this.removeDownloadsFromUI([downloadElements[downloadID]], total);
              elements.downloadsPanel.classList.remove('edit');
              isEditMode = false;
              deletionDone();
            },
            (downloadID, msg) => {
              isMutilDelEditMode = false;
              console.warn(`Could not delete ${downloadID} : ${msg}`);
              this.updateButtonsStatus();
              this.checkEmptyList();
            },
            () => {
              isMutilDelEditMode = false;
            }
          );
        };

        isMutilDelEditMode = true;
        if (multipleDelete) {
          const req = DownloadUI.show(DownloadUI.TYPE.DELETE_ALL, downloadList);
          req.onconfirm = () => {
            doDeleteDownloads();
            elements.downloadsPanel.classList.remove('edit');
            isEditMode = false;
          };
          req.oncancel = () => {
            isMutilDelEditMode = false;
            this.updateButtonsStatus();
            this.checkEmptyList();
          };
        } else {
          doDeleteDownloads();
        }
      },

      changeFocus() {
        if (!MenuMap.optionsShow) {
          window.dispatchEvent(new CustomEvent('refresh'));
        }
      },

      checkShowSoftKey(state, startFlag) {
        DeviceFeature.ready(() => {
          this.showSoftkey(state, startFlag);
        });
      },

      showSoftkey(state, startFlag) {
        let focusedElement = document.querySelector('#downloads .focus');
        if (!focusedElement) {
          focusedElement = document.querySelector('#downloads .focus1');
        }

        const Items = elements.panel.querySelectorAll('#downloadList li');
        if (!focusedElement && startFlag) {
          // eslint-disable-next-line
          focusedElement = Items[0];
        }

        if (focusedElement) {
          const downloadID = focusedElement.id;
          const download = DownloadApiManager.getDownload(downloadID);
          const fileName = DownloadFormatter.getFileName(download);
          const type = MimeMapper.guessTypeFromFileProperties(
            fileName,
            download.contentType
          );
          let downLoadState = focusedElement.getAttribute('data-state');
          const lowMemoryFlag = DeviceFeature.getValue('lowMemory') === 'true';

          if (state) {
            downLoadState = state;
          }
          if ('succeeded' === downLoadState) {
            if (type.startsWith('image/')) {
              SettingsSoftkey.init(elements.succeeWallpaperSoftKeyBar);
            } else if (type.startsWith('audio/')) {
              SettingsSoftkey.init(
                lowMemoryFlag
                  ? elements.succeeMusicSoftKeyBarForLite
                  : elements.succeeMusicSoftKeyBar
              );
            } else {
              SettingsSoftkey.init(elements.succeeNosupportSoftKeyBar);
            }
          } else if ('downloading' === downLoadState) {
            if (type.startsWith('image/')) {
              SettingsSoftkey.init(elements.downloadingWallpaperSoftKeyBar);
            } else if (type.startsWith('audio/')) {
              SettingsSoftkey.init(
                lowMemoryFlag
                  ? elements.downloadingMusicSoftKeyBarForLite
                  : elements.downloadingMusicSoftKeyBar
              );
            } else {
              SettingsSoftkey.init(elements.downloadingNosupportSoftKeyBar);
            }
          } else if (downLoadState === 'stopped') {
            if (type.startsWith('image/')) {
              SettingsSoftkey.init(elements.stoppedWallpaperSoftKeyBar);
            } else if (type.startsWith('audio/')) {
              SettingsSoftkey.init(
                lowMemoryFlag
                  ? elements.stoppedMusicSoftKeyBarForLite
                  : elements.stoppedMusicSoftKeyBar
              );
            } else {
              SettingsSoftkey.init(elements.stoppedNosupportSoftKeyBar);
            }
          } else if (downLoadState === 'failed') {
            if (type.startsWith('image/')) {
              SettingsSoftkey.init(elements.failedWallpaperSoftKeyBar);
            } else if (type.startsWith('audio/')) {
              SettingsSoftkey.init(
                lowMemoryFlag
                  ? elements.failedMusicSoftKeyBarForLite
                  : elements.failedMusicSoftKeyBar
              );
            } else {
              SettingsSoftkey.init(elements.failedNosupportSoftKeyBar);
            }
          }
        }
        SettingsSoftkey.show();
      },

      renderForDownload(downloads, oncomplete) {
        if (!elements.downloadsContainer) {
          return;
        }

        if (!downloads || downloads.length === 0) {
          this.checkEmptyList();
          return;
        }
        let focusItem = elements.panel.querySelector('.focus');
        const focusId = focusItem && focusItem.id;

        // Clean before rendering
        elements.downloadsContainer.innerHTML = '';
        // Render
        downloads.forEach(download => {
          this.appendForDownload(download);
        });

        this.checkEmptyList();
        this.handleActivity();
        if (oncomplete) {
          oncomplete();
        }

        if (focusId) {
          focusItem = elements.panel.querySelector(`#${focusId}`);
          if (focusItem) {
            focusItem.focus();
            focusItem.classList.add('focus');
          }
        }
        this.changeFocus();
        this.changeProgressFocus();
      },

      errorForDownload() {
        // Implement screen or error message
        console.error('Error while retrieving');
      },

      appendForDownload(download) {
        const li = this.createItem(download);
        elements.downloadsContainer.appendChild(li);
        DownloadItem.refresh(li, download);
        download.onstatechange = this.downloadStateChange.bind(this);
      },

      createItem(download) {
        const li = DownloadItem.create(download);
        // Const rightButton = li.querySelector('.right-button');

        if (download.state === 'downloading') {
          setTimeout(() => {
            this.changeFocus();
          }, 500);
          download.onstatechange = this.downloadStateChange.bind(this);
        }

        return li;
      },

      downloadStateChange(event) {
        const { download } = event;

        /*
         * We don't care about finalized as a state change. The DownloadList and
         * DownloadItem are not designed to consume this state change.
         */
        if (download.state === 'finalized') {
          return;
        }
        const downloadId = DownloadItem.getDownloadId(download);
        if (
          resumeClick[downloadId] === true &&
          download.state === 'downloading'
        ) {
          resumeClick[downloadId] = false;
          this.checkShowSoftKey(download.state);
          setTimeout(() => {
            ToastHelper.showToast('downloading-resumed');
          }, 500);

          // This.updateForDownload(download);

          /*
           * DownloadItem.getDataConnState().then((res) => {
           *   if (res) {
           *     ToastHelper.showToast('downloading-resumed');
           *   }
           * });
           */
        }

        if (download.state === 'succeeded' || download.state === 'stopped') {
          const downloadConfirmDialog = document.getElementById(
            'download-confirm-dialog'
          );
          setTimeout(() => {
            if (
              download.state === 'succeeded' &&
              !downloadConfirmDialog.hidden
            ) {
              const header = document.getElementById('downloads-header');
              const head1 = header.firstElementChild;
              head1.setAttribute('data-l10n-id', 'downloads-panel-header');
              downloadConfirmDialog.classList.add('hidden');
              elements.downloadsContainer.classList.remove('hidden');
            }
            this.checkShowSoftKey();
          }, 500);
        }
        this.updateForDownload(download);
        this.updateNotDownloadingDate();
        /*
         * If ('succeeded' === download.state) {
         *   this.addSuccToLocalStorage(download);
         * }
         */
      },

      addSuccToLocalStorage(download) {
        const downloadItems = localStorage.getItem('succ-download-items');
        let arrDownloadItems = [];

        if (downloadItems) {
          arrDownloadItems = JSON.parse(downloadItems);
        }

        arrDownloadItems.push(`${download.id}${download.storagePath}`);
        localStorage.setItem(
          'succ-download-items',
          JSON.stringify(arrDownloadItems)
        );
      },

      updateForDownload(download, click) {
        const id = DownloadItem.getDownloadId(download);
        const elementToUpdate = this.getElementForId(id);
        if (!elementToUpdate) {
          console.error('Item to update not found');
          return;
        }
        DownloadItem.refresh(elementToUpdate, download, click);
        DownloadApiManager.updateDownload(download);
      },

      getElementForId(id) {
        return elements.downloadsContainer.querySelector(`[data-id="${id}"]`);
      },

      handleActivity() {
        if (!ActivityHandler.currentActivity) {
          return;
        }
        /* eslint-disable */
        const downloadFileName = ActivityHandler.currentActivity ?
          ActivityHandler.activitySource.data.downloadFileName : null;
        /* eslint-enable */

        if (!downloadFileName) {
          return;
        }

        const fileName = elements.panel.querySelectorAll('li .fileName');
        for (let i = 0; i < fileName.length; i++) {
          if (fileName[i].textContent === downloadFileName) {
            this.handleChangeFocus(fileName[i].parentNode.parentNode);
          }
        }
      },

      downloadApiManagerListener(changeEvent) {
        let element = null;

        switch (changeEvent.type) {
          case 'added':
            /*
             * First we'll try and find an existing item with the download
             * api id.
             */
            if (
              changeEvent.downloadApiId &&
              (element = this.getElementForId(changeEvent.downloadApiId))
            ) {
              /*
               * If we find one, we'll want to update it's id before updating
               * the content.
               */
              DownloadItem.updateDownloadId(changeEvent.download, element);
            } else if (this.getElementForId(changeEvent.download.id)) {
              // Secondly, try and find it by it's download id.
              this.updateForDownload(changeEvent.download);
            } else {
              /*
               * Lastly, if we didn't find it by downloadApiId or id, it's truly
               * new to the user so we need to add it to the download list.
               */
              this.newDownload(changeEvent.download);
              resumeClick[
                DownloadItem.getDownloadId(changeEvent.download)
              ] = false;
              // _changeFocus();
            }
            break;
          default:
            break;
        }
      },

      newDownload(download) {
        this.prepend(download);
        if (isEditMode) {
          numberOfDownloads++;
          this.updateButtonsStatus();
        }
      },

      prepend(download) {
        if (elements.downloadsContainer.children.length === 0) {
          this.appendForDownload(download);
          this.checkEmptyList();
          return;
        }

        const li = this.createItem(download);
        elements.downloadsContainer.insertBefore(
          li,
          elements.downloadsContainer.firstChild
        );
        DownloadItem.refresh(li, download);
        this.checkEmptyList();
      },

      updateNotDownloadingDate() {
        const listItems = elements.panel.querySelectorAll('.download-list li');

        for (let i = 0; i < listItems.length; i++) {
          const download = DownloadApiManager.getDownload(
            listItems[i].dataset.id
          );

          if ('downloading' === download.state) {
            continue;
          }
          listItems[i].querySelector(
            '.date'
          ).textContent = DownloadItem.getDate(download);
        }
      },

      handleKeydown(event) {
        let focusedElement = null;
        switch (event.key) {
          case 'Enter':
          case 'Accept':
            if (0 === NavigationMap.currentActivatedLength) {
              focusedElement = document.querySelector('#downloads .focus');
              if (focusedElement) {
                if (isEditMode) {
                  event.stopPropagation();
                  event.preventDefault();
                  this.onDownloadSelected(event);
                }
              }
            }
            break;
          case 'ArrowDown':
          case 'ArrowUp':
            if (MenuMap.optionsShow === false) {
              if (isEditMode === true) {
                this.updateButtonsStatus();
              } else if (!document.getElementById('option-menu')) {
                this.checkShowSoftKey();
              }
            }
            break;
          case 'BrowserBack':
          case 'Backspace':
            if (NavigationMap.currentActivatedLength > 0) {
              isMutilDelEditMode = false;
            } else if (isMutilDelEditMode) {
              event.preventDefault();
              event.stopPropagation();
              isMutilDelEditMode = false;
              this.updateButtonsStatus();
            } else if (isEditMode) {
              event.preventDefault();
              event.stopPropagation();
              this.closeEditMode();
              this.checkShowSoftKey();
            }
            break;
          default:
            break;
        }
      },

      changeProgressFocus() {
        if (MenuMap.optionsShow) {
          return;
        }

        const selectedItem = document.querySelectorAll(
          '#downloads gaia-progress'
        );
        const focusProgressItem = document.querySelector(
          '#downloads .focus gaia-progress'
        );

        for (let i = 0; i < selectedItem.length; i++) {
          if (selectedItem[i].selected) {
            selectedItem[i].selected = 'false';
          }
        }

        if (focusProgressItem) {
          focusProgressItem.selected = 'true';
        }
      },

      onDownloadSelected(event) {
        if (
          isEditMode &&
          (event.target.tagName === 'LI' ||
            event.target.tagName === 'INPUT' ||
            event.target.tagName === 'BODY')
        ) {
          const focusedElement = document.querySelector('#downloads .focus');
          // eslint-disable-next-line
          const input = focusedElement.childNodes[0].childNodes[0];
          if (typeof input === 'undefined') {
            return;
          }
          if (input.checked) {
            input.checked = false;
          } else {
            input.checked = true;
          }
          const { checked } = input;
          // eslint-disable-next-line
          checked ? numberOfCheckedDownloads++ : numberOfCheckedDownloads--;
          l10n.setAttributes(elements.selectnumber, 'downloads-selected', {
            n: numberOfCheckedDownloads
          });
          this.updateButtonsStatus();
        }
      },

      closeEditMode() {
        // Remove 'edit' styles
        elements.downloadsPanel.classList.remove('edit');

        // DownloadsEditMenu.hidden = true;

        // Clean vars
        isEditMode = false;
        numberOfDownloads = 0;
        numberOfCheckedDownloads = 0;
        this.checkShowSoftKey();
      }
    });
  };
});
