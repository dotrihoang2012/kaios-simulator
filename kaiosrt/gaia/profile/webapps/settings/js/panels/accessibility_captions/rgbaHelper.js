
define([],function() { // eslint-disable-line
  const colorToRgbMap = {
    white: '255,255,255',
    black: '0,0,0',
    red: '255,0,0',
    yellow: '255,255,0',
    green: '0,255,0',
    cyan: '0,255,255',
    blue: '0,0,255',
    magenta: '255,0,255'
  };

  const rgbToColorMap = {
    '255,255,255': 'white',
    '0,0,0': 'black',
    '255,0,0': 'red',
    '255,255,0': 'yellow',
    '0,255,0': 'green',
    '0,255,255': 'cyan',
    '0,0,255': 'blue',
    '255,0,255': 'magenta'
  };

  // eslint-disable-next-line
  const rgbaRex = /rgba*\((\d+)\,\ *(\d+)\,\ *(\d+)(?:\,\ *(.+))?\)/;

  return {
    convertColorToRgb(name) {
      return colorToRgbMap[name];
    },
    convertRgbToColor(rgba) {
      return rgbToColorMap[rgba];
    },
    getRgbaValue(string) {
      return rgbaRex.exec(string);
    }
  };
});
