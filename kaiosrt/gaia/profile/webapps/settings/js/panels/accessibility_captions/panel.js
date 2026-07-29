
/* eslint "prefer-destructuring": 'off' */
define(['require','modules/settings_panel','panels/accessibility_captions/rgbaHelper'],function(require) { // eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');
  const RGBAHelper = require('panels/accessibility_captions/rgbaHelper');

  return function createAccessibilityCaptionsPanel() {
    const CAPTIONS_ENABLED_KEY = 'accessibility.captions';

    const FONT_SIZE_KEY = 'accessibility.caption.font-size';

    const THEME_KEY = 'accessibility.caption.theme';
    const FONT_KEY = 'accessibility.caption.font-color';
    const EDGE_KEY = 'accessibility.caption.font-shadow';
    const BACKGROUND_KEY = 'accessibility.caption.box-color';
    const THEME_CUSTOM_ENABLED_KEY = 'accessibility.captions.theme.custom';

    let CaptionCache = null;
    let exampleBoxHeight = null;

    let captionExample = null;
    let themeElem = null;
    let fontColorElem = null;
    let fontOpacityElem = null;
    let edgeTypeElem = null;
    let edgeColorElem = null;
    let backgroundColorElem = null;
    let backgroundOpacityElem = null;
    let listElements = null;

    function updateItemByDataShowName(key, value) {
      const rule = `[data-show-name="${key}"]`;
      const items = document.querySelectorAll(rule);
      for (let i = 0; i < items.length; i++) {
        items[i].classList.toggle('hidden', !value);
      }
    }

    function captionEnableHandler(value) {
      CaptionCache[CAPTIONS_ENABLED_KEY] = value;
      updateItemByDataShowName(CAPTIONS_ENABLED_KEY, value);
      setThemeCustom();
    }

    function themeHandler(value) {
      CaptionCache[THEME_KEY] = value;
      const captionStyles = value.split(';');
      captionStyles.forEach(captionStyle => {
        if (!captionStyle.length) {
          return;
        }

        captionStyle = captionStyle.split(':');
        let key = captionStyle[0].trim();
        const styleValue = captionStyle[1].trim();
        switch (key) {
          case 'font-color':
            key = 'color';
            break;
          case 'box-color':
            key = 'backgroundColor';
            break;
          case 'font-shadow':
            key = 'textShadow';
            break;
          default:
            break;
        }
        captionExample.style[key] = styleValue;
      });

      const { options } = themeElem;
      let isCustomValue = true;
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option.value === value) {
          isCustomValue = false;
          break;
        }
      }

      if (isCustomValue) {
        value = 'custom';
      }

      themeElem.value = value;
      setThemeCustom();
    }

    function fontHandler(value) {
      CaptionCache[FONT_KEY] = value;
      if (themeElem.value === 'custom') {
        captionExample.style.color = value;
      }

      let color = null;
      let opacity = null;
      const rgbaNumbers = RGBAHelper.getRgbaValue(value);
      if (rgbaNumbers) {
        color = rgbaNumbers[1];
        color += `,${rgbaNumbers[2]}`;
        color += `,${rgbaNumbers[3]}`;
        opacity = rgbaNumbers[4] || 1;
      } else {
        color = value;
        opacity = 1;
      }
      fontColorElem.value = RGBAHelper.convertRgbToColor(color);
      fontOpacityElem.value = opacity;
      checkSettingsComplete();
    }

    function edgeHandler(value) {
      CaptionCache[EDGE_KEY] = value;
      if (themeElem.value === 'custom') {
        captionExample.style.textShadow = value;
      }

      let color = null;
      const edges = value.split(',');
      switch (edges.length) {
        case 1:
          // None & dropshadow
          if (edges[0] === 'none') {
            edgeTypeElem.value = 'none';
          } else {
            color = edges[0].trim().split(' ')[3];
            edgeTypeElem.value = 'dropshadow';
            edgeColorElem.value = color;
          }
          break;
        case 2:
          // Raised & depressed
          color = edges[0].trim().split(' ')[3];
          if (color === '#FFFFFF') {
            color = edges[1].trim().split(' ')[3];
            edgeTypeElem.value = 'raised';
            edgeColorElem.value = color;
          } else {
            edgeTypeElem.value = 'depressed';
            edgeColorElem.value = color;
          }
          break;
        case 4:
          // Outline
          color = edges[0].trim().split(' ')[3];
          edgeTypeElem.value = 'outline';
          edgeColorElem.value = color;
          break;
        default:
          break;
      }
      checkSettingsComplete();
    }

    function backgroundHandler(value) {
      CaptionCache[BACKGROUND_KEY] = value;
      if (themeElem.value === 'custom') {
        captionExample.style.backgroundColor = value;
      }

      let color = null;
      let opacity = null;
      const rgbaNumbers = RGBAHelper.getRgbaValue(value);
      if (rgbaNumbers) {
        color = rgbaNumbers[1];
        color += `,${rgbaNumbers[2]}`;
        color += `,${rgbaNumbers[3]}`;
        color = RGBAHelper.convertRgbToColor(color);
        opacity = rgbaNumbers[4] || 1;
      } else if (value === 'transparent') {
        color = value;
        opacity = backgroundOpacityElem.value;
      } else {
        color = value;
        opacity = 1;
      }
      backgroundColorElem.value = color;
      backgroundOpacityElem.value = opacity;
      checkSettingsComplete();
    }

    function setTheme() {
      const cset = {};
      if (themeElem.value !== 'custom') {
        cset[THEME_KEY] = themeElem.value;
      } else if (
        CaptionCache[FONT_KEY] &&
        CaptionCache[BACKGROUND_KEY] &&
        CaptionCache[EDGE_KEY]
      ) {
        let theme = `font-color:${CaptionCache[FONT_KEY]};`;
        theme += `box-color:${CaptionCache[BACKGROUND_KEY]};`;
        theme += `font-shadow:${CaptionCache[EDGE_KEY]};`;
        cset[THEME_KEY] = theme;
      }
      SettingsDBCache.saveSettings(cset);
    }

    function setFont() {
      if (themeElem.value !== 'custom') {
        return;
      }

      const color = fontColorElem.value;
      const opacity = fontOpacityElem.value;

      const cset = {};
      cset[FONT_KEY] = getRgbaString(color, opacity);
      SettingsDBCache.saveSettings(cset);
    }

    function setBackground() {
      if (themeElem.value !== 'custom') {
        return;
      }

      const color = backgroundColorElem.value;
      const opacity = backgroundOpacityElem.value;

      const cset = {};
      cset[BACKGROUND_KEY] =
        color === 'transparent' ? color : getRgbaString(color, opacity);
      SettingsDBCache.saveSettings(cset);
    }

    function setEdge() {
      if (themeElem.value !== 'custom') {
        return;
      }

      const cset = {};
      cset[EDGE_KEY] = getEdgeString(edgeTypeElem.value, edgeColorElem.value);
      SettingsDBCache.saveSettings(cset);
    }

    function getRgbaString(color, opacity) {
      let rgbaColor = 'rgba(';
      rgbaColor += `${RGBAHelper.convertColorToRgb(color)},${opacity}`;
      rgbaColor += ')';
      return rgbaColor;
    }

    function getEdgeString(type, color) {
      let edge = 'none';

      switch (type) {
        case 'outline':
          edge = `-1px -1px 0 ${color},`;
          edge += `1px -1px 0 ${color},`;
          edge += `-1px 1px 0 ${color},`;
          edge += `1px 1px 0 ${color}`;
          break;
        case 'dropshadow':
          edge = `1px 1px 2px ${color}`;
          break;
        case 'raised':
          edge = '-1px -1px 2px #FFFFFF,';
          edge += `1px 1px 2px ${color}`;
          break;
        case 'depressed':
          edge = `-1px -1px 2px ${color},`;
          edge += '1px 1px 2px #FFFFFF';
          break;
        default:
          break;
      }
      return edge;
    }
    function setThemeCustom() {
      let custom = true;
      if (CaptionCache[THEME_KEY]) {
        if (themeElem.value !== 'custom') {
          custom = false;
        } else if (CaptionCache[CAPTIONS_ENABLED_KEY] === false) {
          custom = false;
        }

        const cset = {};
        cset[THEME_CUSTOM_ENABLED_KEY] = custom;
        SettingsDBCache.saveSettings(cset);
      }
    }

    function checkSettingsComplete() {
      if (CaptionCache[THEME_KEY] && themeElem.value !== 'custom') {
        // Do nothing
      } else if (
        CaptionCache[THEME_KEY] &&
        CaptionCache[FONT_KEY] &&
        CaptionCache[BACKGROUND_KEY] &&
        CaptionCache[EDGE_KEY]
      ) {
        setTheme();
      }
    }

    function handleChange(value, key) {
      switch (key) {
        case CAPTIONS_ENABLED_KEY:
          captionEnableHandler(value);
          break;
        case THEME_KEY:
          themeHandler(value);
          break;
        case FONT_KEY:
          fontHandler(value);
          break;
        case FONT_SIZE_KEY:
          captionExample.style.fontSize = `${Math.round(
            exampleBoxHeight * value * 100
          ) / 100}px`;
          break;
        case EDGE_KEY:
          edgeHandler(value);
          break;
        case BACKGROUND_KEY:
          backgroundHandler(value);
          break;
        case THEME_CUSTOM_ENABLED_KEY:
          updateItemByDataShowName(THEME_CUSTOM_ENABLED_KEY, value);
          window.dispatchEvent(new CustomEvent('refresh'));
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        listElements = panel.querySelectorAll('li');
        captionExample = panel.querySelector('#captions-preview-example');
        exampleBoxHeight = panel.querySelector('#caption-preview').offsetHeight;
        themeElem = panel.querySelector('#captions-theme');
        fontColorElem = panel.querySelector('#captions-font-color');
        fontOpacityElem = panel.querySelector('#captions-font-opacity');
        edgeTypeElem = panel.querySelector('#captions-edge-type');
        edgeColorElem = panel.querySelector('#captions-edge-color');
        backgroundColorElem = panel.querySelector('#captions-background-color');
        backgroundOpacityElem = panel.querySelector(
          '#captions-background-opacity'
        );
      },

      onBeforeShow: function onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        ListFocusHelper.addEventListener(listElements);

        CaptionCache = {};
        SettingsDBCache.observe(CAPTIONS_ENABLED_KEY, false, handleChange);
        SettingsDBCache.observe(
          THEME_KEY,
          'font-color:white;box-color:black;font-shadow:none;',
          handleChange
        );
        themeElem.onchange = setTheme.bind(this);

        fontColorElem.onchange = setFont.bind(this);
        fontOpacityElem.onchange = setFont.bind(this);

        SettingsDBCache.observe(FONT_KEY, 'rgba(255,255,255,1)', handleChange);

        SettingsDBCache.observe(FONT_SIZE_KEY, '0.08', handleChange);
        edgeTypeElem.onchange = setEdge.bind(this);
        edgeColorElem.onchange = setEdge.bind(this);
        SettingsDBCache.observe(EDGE_KEY, 'none', handleChange);
        backgroundColorElem.onchange = setBackground.bind(this);
        backgroundOpacityElem.onchange = setBackground.bind(this);

        SettingsDBCache.observe(BACKGROUND_KEY, 'rgba(0,0,0,1)', handleChange);
        SettingsDBCache.observe(THEME_CUSTOM_ENABLED_KEY, false, handleChange);
      },

      onBeforeHide: function onBeforeHide() {
        SettingsDBCache.unobserve(CAPTIONS_ENABLED_KEY, handleChange);
        SettingsDBCache.unobserve(THEME_KEY, handleChange);
        SettingsDBCache.unobserve(FONT_KEY, handleChange);
        SettingsDBCache.unobserve(FONT_SIZE_KEY, handleChange);
        SettingsDBCache.unobserve(EDGE_KEY, handleChange);
        SettingsDBCache.unobserve(BACKGROUND_KEY, handleChange);
        SettingsDBCache.unobserve(THEME_CUSTOM_ENABLED_KEY, handleChange);

        SettingsSoftkey.hide();
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
