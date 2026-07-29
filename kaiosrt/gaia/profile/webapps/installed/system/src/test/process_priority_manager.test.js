import processPriorityManager, {
  COMMAND_TYPE,
  ENQUEUE_EVENT_NAME,
  WINDOW_TERMINATED_EVENT_NAME,
  validator,
  compose,
} from '../process_priority_manager';

function mockProcManager() {
  window.ProcManager = {
    _pidState: {},
    _state: {
      isInTransaction: false,
      currentTransaction: {},
    },
    _clear: () => {
      window.ProcManager._pidState = {};
      window.ProcManager._state.isInTransaction = false;
      window.ProcManager._state.currentTransaction = {};
    },
    begin: () => {
      window.ProcManager._state.isInTransaction = true;
      return Promise.resolve();
    },
    add: (pid, groupType) => {
      if (window.ProcManager._state.isInTransaction) {
        window.ProcManager._state.currentTransaction[pid] = groupType;
        return Promise.resolve();
      }
      return Promise.reject('is not in transaction');
    },
    remove: (pid) => {
      if (window.ProcManager._state.isInTransaction) {
        window.ProcManager._state.currentTransaction[pid] = '__TO_BE_REMOVED__';
        return Promise.resolve();
      }
      return Promise.reject('is not in transaction');
    },
    commit: () => {
      Object.entries(window.ProcManager._state.currentTransaction).forEach(([pid, groupType]) => {
        if (groupType === '__TO_BE_REMOVED__') {
          delete window.ProcManager._pidState[pid];
        } else {
          window.ProcManager._pidState[pid] = groupType;
        }
      });
      window.ProcManager._state.isInTransaction = false;
      window.ProcManager._state.currentTransaction = {};
      return Promise.resolve();
    },
  };
}

describe('process_priority_manager', () => {
  beforeEach(() => {
    mockProcManager();
    window.manager = processPriorityManager;
    window.manager.start();
  });

  afterEach(() => {
    // Clean-up
    window.manager.stop();
    window.manager.reset();
    window.ProcManager._clear();
  });

  describe('basic functions', () => {
    it('should pass smoke test', (done) => {
      // Make sure that our target module is properly loaded and ran without
      // explicit errors.
      done();
    });

    it('should listen to global event to enqueue a new task', (done) => {
      // Arrange
      const command = {
        type: COMMAND_TYPE.SET_PRIORITY,
        pid: 1,
        groupType: 0,
      };

      // Action
      window.dispatchEvent(
        new CustomEvent(ENQUEUE_EVENT_NAME, {
          detail: command,
        })
      );

      // Assert
      expect(window.manager.commandQueue.length).toEqual(1);
      expect(window.manager.commandQueue[0].id).toEqual(1);

      done();
    });

    it('should listen to window terminated event to enqueue a new task', (done) => {
      // Arrange
      const detail = { processid: 123 };

      // Action
      window.dispatchEvent(
        new CustomEvent(WINDOW_TERMINATED_EVENT_NAME, { detail })
      );

      // Assert
      expect(window.manager.commandQueue.length).toEqual(1);
      expect(window.manager.commandQueue[0].id).toEqual(1);

      done();
    });

    it('should not accept a command if given type is invalid', (done) => {
      // Arrange
      const command = {
        type: undefined,
        pid: 1,
        groupType: 0,
      };

      // Action
      window.dispatchEvent(
        new CustomEvent(ENQUEUE_EVENT_NAME, {
          detail: command,
        })
      );

      // Assert
      expect(window.manager.commandQueue.length).toEqual(0);

      done();
    });

    it('should not accept a command if given pid is invalid', (done) => {
      // Arrange
      const command = {
        type: COMMAND_TYPE.SET_PRIORITY,
        pid: undefined,
        groupType: 0,
      };

      // Action
      window.dispatchEvent(
        new CustomEvent(ENQUEUE_EVENT_NAME, {
          detail: command,
        })
      );
      window.dispatchEvent(
        new CustomEvent(WINDOW_TERMINATED_EVENT_NAME, {
          detail: { processid: undefined }
        })
      );

      // Assert
      expect(window.manager.commandQueue.length).toEqual(0);
      expect(Object.keys(window.manager.stateOfPidList).length).toEqual(0);

      done();
    });

    it('should not accept a command if given groupType is invalid', (done) => {
      // Arrange
      const command = {
        type: COMMAND_TYPE.SET_PRIORITY,
        pid: 1,
        groupType: undefined,
      };

      // Action
      window.dispatchEvent(
        new CustomEvent(ENQUEUE_EVENT_NAME, {
          detail: command,
        })
      );

      // Assert
      expect(window.manager.commandQueue.length).toEqual(0);

      done();
    });

    it('should start to consume tasks as soon as it enqueued a new task', (done) => {
      // Arrange
      const command = {
        type: COMMAND_TYPE.SET_PRIORITY,
        pid: 1,
        groupType: 0,
      };

      // Action
      window.dispatchEvent(
        new CustomEvent(ENQUEUE_EVENT_NAME, {
          detail: command,
        })
      );

      // Assert
      expect(window.manager.isRunning).toEqual(true);
      expect(window.manager.commandQueue[0].status).toEqual('working');

      done();
    });

    it('should consume and finish tasks of type "set-priority"', async (done) => {
      // Arrange
      const command = {
        type: COMMAND_TYPE.SET_PRIORITY,
        pid: 123,
        groupType: 0,
      };

      // Action
      window.dispatchEvent(
        new CustomEvent(ENQUEUE_EVENT_NAME, {
          detail: command,
        })
      );

      // Assert
      const [firstTask] = window.manager.commandQueue;
      expect(window.manager.isRunning).toEqual(true);
      expect(firstTask.status).toEqual('working');

      // Wait for a while.
      await sleep(100);

      expect(window.manager.isRunning).toEqual(false);
      expect(Object.keys(window.manager.stateOfPidList).length).toEqual(1);
      expect(firstTask.status).toEqual('done');
      expect(window.ProcManager._pidState['123']).toEqual(0);

      done();
    });

    it('should consume and finish tasks of type "remove-priority"', async (done) => {
      // Arrange
      const commands = [
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },
        { type: COMMAND_TYPE.REMOVE_PRIORITY, pid: 123 },
      ];

      // Action
      commands.forEach((command) => {
        window.dispatchEvent(
          new CustomEvent(ENQUEUE_EVENT_NAME, {
            detail: command,
          })
        );
      });

      expect(window.manager.isRunning).toEqual(true);

      // Wait for a while.
      await sleep(100);

      // Assert
      expect(window.manager.isRunning).toEqual(false);
      expect(Object.keys(window.manager.stateOfPidList).length).toEqual(0);
      expect(window.ProcManager._pidState['123']).toEqual(undefined);

      done();
    });

    it('should consume tasks in sequence, one at a time', async (done) => {
      // Arrange
      const commands = [
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 0 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 789, groupType: 1 },
      ];

      // Action
      commands.forEach((command) => {
        window.dispatchEvent(
          new CustomEvent(ENQUEUE_EVENT_NAME, {
            detail: command,
          })
        );
      });

      // Assert
      const [
        firstTask,
        secondTask,
        thirdTask
      ] = window.manager.commandQueue;

      expect(window.manager.isRunning).toEqual(true);
      expect(firstTask.status).toEqual('working');
      expect(secondTask.status).toEqual('pending');
      expect(thirdTask.status).toEqual('pending');

      // Wait for the queue to be finished.
      await sleep(100);

      expect(window.manager.isRunning).toEqual(false);
      expect(firstTask.status).toEqual('done');
      expect(secondTask.status).toEqual('done');
      expect(thirdTask.status).toEqual('done');
      expect(window.ProcManager._pidState['123']).toEqual(1);
      expect(window.ProcManager._pidState['456']).toEqual(0);
      expect(window.ProcManager._pidState['789']).toEqual(1);

      done();
    });
  });

  describe('task optimization', () => {
    it("should drop the request if it's identical to the previous one", async (done) => {
      // Arrange
      const commands = [
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },
      ];

      // Action
      commands.forEach((command) => {
        window.dispatchEvent(
          new CustomEvent(ENQUEUE_EVENT_NAME, {
            detail: command,
          })
        );
      });

      // Assert
      expect(window.manager.isRunning).toEqual(true);
      expect(window.manager.commandQueue.length).toEqual(1);

      // Wait for the queue to be finished.
      await sleep(100);

      expect(window.manager.isRunning).toEqual(false);
      expect(window.ProcManager._pidState['123']).toEqual(1);

      done();
    });

    it("should optimize the queue if there're multiple requests target to the same pid", async (done) => {
      // Arrange
      const commands = [
        // The first request is only for making queue busy.
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 0, groupType: 0 },
        // The manager should optimize the following four requests
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 0 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 1 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 0 },
      ];

      // Action
      commands.forEach((command) => {
        window.dispatchEvent(
          new CustomEvent(ENQUEUE_EVENT_NAME, {
            detail: command,
          })
        );
      });

      // Assert
      expect(window.manager.isRunning).toEqual(true);
      const [
        firstTask,
        secondTask,
        thirdTask,
        fourthTask,
        fifthTask,
      ] = window.manager.commandQueue;

      // Wait for the queue to be finished.
      await sleep(100);

      expect(firstTask.status).toEqual('done');

      // According to the optimization algorithm,
      // the 2nd and 3rd task should be dropped
      // and the 4th and 5th task should be finished.
      expect(secondTask.status).toEqual('dropped');
      expect(thirdTask.status).toEqual('dropped');
      expect(fourthTask.status).toEqual('done');
      expect(fifthTask.status).toEqual('done');

      expect(window.manager.isRunning).toEqual(false);
      expect(window.ProcManager._pidState['123']).toEqual(1);
      expect(window.ProcManager._pidState['456']).toEqual(0);

      done();
    });

    it('should optimize the queue that mixed multiple types of command', async (done) => {
      // Arrange
      const commands = [
        // The first request is only for making queue busy.
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 0, groupType: 0 },

        // A series of request to pid 123.
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 0 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },
        { type: COMMAND_TYPE.REMOVE_PRIORITY, pid: 123 },

        // A series of request to pid 456.
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 1 },
        { type: COMMAND_TYPE.REMOVE_PRIORITY, pid: 456 },
        { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 0 },
      ];

      // Action
      commands.forEach((command) => {
        window.dispatchEvent(
          new CustomEvent(ENQUEUE_EVENT_NAME, {
            detail: command,
          })
        );
      });

      // Assert
      expect(window.manager.isRunning).toEqual(true);

      // Wait for the queue to be finished.
      await sleep(100);

      expect(window.manager.isRunning).toEqual(false);
      expect(window.ProcManager._pidState['123']).toEqual(undefined);
      expect(window.ProcManager._pidState['456']).toEqual(0);

      done();
    });
  });
});

describe('validator', () => {
  describe('isValidPid() method', () => {
    it('should return true when given value is valid', (done) => {
      expect(validator.isValidPid(0)).toEqual(true);
      expect(validator.isValidPid(1)).toEqual(true);
      expect(validator.isValidPid(123)).toEqual(true);
      expect(validator.isValidPid('0')).toEqual(true);
      expect(validator.isValidPid('1')).toEqual(true);
      expect(validator.isValidPid('123')).toEqual(true);
      done();
    });

    it('should return false when given value is invalid', (done) => {
      expect(validator.isValidPid()).toEqual(false);
      expect(validator.isValidPid(undefined)).toEqual(false);
      expect(validator.isValidPid(null)).toEqual(false);
      expect(validator.isValidPid(NaN)).toEqual(false);
      expect(validator.isValidPid('str')).toEqual(false);
      done();
    });
  });

  describe('isValidGroupType() method', () => {
    it('should return true when given value is valid', (done) => {
      expect(validator.isValidGroupType(0)).toEqual(true);
      expect(validator.isValidGroupType(1)).toEqual(true);
      expect(validator.isValidGroupType(123)).toEqual(true);
      expect(validator.isValidGroupType('0')).toEqual(true);
      expect(validator.isValidGroupType('1')).toEqual(true);
      expect(validator.isValidGroupType('123')).toEqual(true);
      done();
    });

    it('should return false when given value is invalid', (done) => {
      expect(validator.isValidGroupType()).toEqual(false);
      expect(validator.isValidGroupType(undefined)).toEqual(false);
      expect(validator.isValidGroupType(null)).toEqual(false);
      expect(validator.isValidGroupType(NaN)).toEqual(false);
      expect(validator.isValidGroupType('str')).toEqual(false);
      done();
    });
  });
});

describe('compose function', () => {
  it('should drop requests that targets to the same pid', (done) => {
    // Arrange
    const queue = [
      { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 0 },
      { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },

      { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 1 },
      { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 0 },
    ];

    // Action
    const optimizedQueue = compose(queue);

    // Assert
    expect(optimizedQueue.length).toEqual(2);

    expect(optimizedQueue[0].pid).toEqual(123);
    expect(optimizedQueue[0].groupType).toEqual(1);
    expect(optimizedQueue[1].pid).toEqual(456);
    expect(optimizedQueue[1].groupType).toEqual(0);

    expect(queue[0].status).toEqual('dropped');
    expect(queue[2].status).toEqual('dropped');

    done();
  });

  it('should drop requests that targets to the same pid (mixed types of requests)', (done) => {
    // Arrange
    const queue = [
      { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 0 },
      { type: COMMAND_TYPE.REMOVE_PRIORITY, pid: 123 },
      { type: COMMAND_TYPE.SET_PRIORITY, pid: 123, groupType: 1 },

      { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 1 },
      { type: COMMAND_TYPE.SET_PRIORITY, pid: 456, groupType: 0 },
      { type: COMMAND_TYPE.REMOVE_PRIORITY, pid: 456 },
    ];

    // Action
    const optimizedQueue = compose(queue);

    // Assert
    expect(optimizedQueue.length).toEqual(2);

    expect(optimizedQueue[0].type).toEqual(COMMAND_TYPE.SET_PRIORITY);
    expect(optimizedQueue[0].pid).toEqual(123);
    expect(optimizedQueue[0].groupType).toEqual(1);
    expect(optimizedQueue[1].type).toEqual(COMMAND_TYPE.REMOVE_PRIORITY);
    expect(optimizedQueue[1].pid).toEqual(456);

    expect(queue[0].status).toEqual('dropped');
    expect(queue[1].status).toEqual('dropped');
    expect(queue[3].status).toEqual('dropped');
    expect(queue[4].status).toEqual('dropped');

    done();
  });
});

function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), duration);
  });
}
