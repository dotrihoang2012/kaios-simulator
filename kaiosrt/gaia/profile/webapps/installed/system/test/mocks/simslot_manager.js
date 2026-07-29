global.SIMSlotManager = {
  isMultiSIM: () => {
    return false;
  },
  hasOnlyOneSIMCardDetected: jest.fn(),
  getSlots: jest.fn().mockImplementation(() => {return []}),
  ready: true,
  isSIMCardAbsent: jest.fn(),
  noSIMCardOnDevice: jest.fn()
};
