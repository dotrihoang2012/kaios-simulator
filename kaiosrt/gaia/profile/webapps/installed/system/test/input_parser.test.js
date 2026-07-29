require('../js/input_parser');

describe('input_parser', () => {
  test('importTime', (done) => {
    const { InputParser } = window;
    expect(InputParser.importTime('23:20:50.52'))
      .toEqual({ hours: 23, minutes: 20, seconds: 50 });
    done();
  });

  test('exportTime', (done) => {
    const { InputParser } = window;
    expect(InputParser.exportTime(new Date('December 17, 1995 03:24:00')))
      .toBe('03:24:00');
    done();
  });

  test('importDate', (done) => {
    const { InputParser } = window;
    expect(InputParser.importDate('1997-12-19'))
      .toEqual({ year: 1997, month: 11, date: 19 });
    done();
  });

  test('exportDate', (done) => {
    const { InputParser } = window;
    expect(InputParser.exportDate(new Date('December 17, 1995 03:24:00')))
      .toBe('1995-12-17');
    done();
  });

  test('formatInputDate', (done) => {
    const { InputParser } = window;
    expect(InputParser.formatInputDate('1992-12-22', '11:02:30'))
      .toEqual(new Date('December 22, 1992 11:02:30'));
    done();
  });
});
