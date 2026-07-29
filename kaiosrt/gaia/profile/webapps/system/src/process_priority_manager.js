export const WINDOW_TERMINATED_EVENT_NAME = 'windowterminated';
export const ENQUEUE_EVENT_NAME = 'enqueue-procmanager-command';

export const COMMAND_TYPE = {
  SET_PRIORITY: 'set-priority',
  REMOVE_PRIORITY: 'remove-priority',
};

// A set of validating function that helps to verify the command payload.
export const validator = {
  // The pid should be a valid integer.
  isValidPid(pid) {
    return Number.isInteger(parseFloat(pid, 10));
  },
  // The groupType should be a valid integer.
  isValidGroupType(type) {
    return Number.isInteger(parseFloat(type, 10));
  },
};

// Compose multiple operations that targets to the same PID.
// By doing so, we can save the time from unnecessary operations.
export function compose(rawCommandQueue) {
  const optimizedCommandQueue = Object.create(null);
  // Only leave the last command for each PID;
  // Other than that, marks as dropped.
  for (let len = rawCommandQueue.length, i = len - 1; i >= 0; i--) {
    const rawCommand = rawCommandQueue[i];
    const { pid } = rawCommand;
    if (optimizedCommandQueue[pid]) {
      rawCommand.status = 'dropped';
      debug(
        `[Op #${
          rawCommand.id
        }] Dropped an enqueued command (type=${
          rawCommand.type
        },pid=${
          rawCommand.pid
        },group=${
          rawCommand.groupType
        }), reason = unnecessary operation to the final result.`
      );
    } else {
      optimizedCommandQueue[pid] = rawCommand;
    }
  }

  return Object.values(optimizedCommandQueue);
}

// The function that invokes procmanager API and shifts process priorities.
async function setProcessPriority(command) {
  const { id, pid, groupType } = command;

  try {
    debug(
      `[Op #${id}] Begin the transaction of ` +
      `adding pid=${pid} to group=${groupType}`
    );
    await window.ProcManager.begin('sysapp');
  } catch (err) {
    debug(
      `[Op #${id}] Failed to begin the transaction of ` +
      `adding pid=${pid} to group=${groupType}, ` +
      `reason=${err}`
    );
    throw err;
  }

  try {
    debug(`[Op #${id}] Add pid=${pid} to group=${groupType}`);
    await window.ProcManager.add(pid, groupType);
  } catch (err) {
    debug(
      `[Op #${id}] Failed to add pid=${pid} to group=${groupType}, ` +
      `reason=${err}`
    );
    throw err;
  }

  try {
    debug(
      `[Op #${id}] Commit the transaction of ` +
      `adding pid=${pid} to group=${groupType}`
    );
    await window.ProcManager.commit();
  } catch (err) {
    debug(
      `[Op #${id}] Failed to commit the transaction of ` +
      `adding pid=${pid} to group=${groupType}, reason=${err}`
    );
    throw err;
  }
}

async function removeProcessPriority(command) {
  const { id, pid } = command;

  try {
    debug(
      `[Op #${id}] Begin the transaction of ` +
      `removing pid=${pid}`
    );
    await window.ProcManager.begin('sysapp');
  } catch (err) {
    debug(
      `[Op #${id}] Failed to begin the transaction of ` +
      `removing pid=${pid}`
    );
    throw err;
  }

  try {
    debug(`[Op #${id}] Try to remove pid=${pid}`);
    await window.ProcManager.remove(pid);
  } catch (err) {
    debug(`[Op #${id}] Failed to remove pid=${pid}`);
    throw err;
  }

  try {
    debug(
      `[Op #${id}] Commit the transaction of ` +
      `removing pid=${pid}`
    );
    await window.ProcManager.commit();
  } catch (err) {
    debug(
      `[Op #${id}] Failed to commit the transaction of ` +
      `removing pid=${pid}`
    );
    throw err;
  }
}

// The manager that arrange, optimize, and perform the process priority changes
class ProcessPriorityManager {
  commandId = 0;
  commandQueue = [];
  // Keep the latest state of each PIDs for queue optimization.
  stateOfPidList = Object.create(null);
  // State that represents if the job consumption is running.
  isRunning = false;

  start() {
    window.addEventListener(WINDOW_TERMINATED_EVENT_NAME, this);
    window.addEventListener(ENQUEUE_EVENT_NAME, this);
  }

  stop() {
    window.removeEventListener(WINDOW_TERMINATED_EVENT_NAME, this);
    window.removeEventListener(ENQUEUE_EVENT_NAME, this);
  }

  reset() {
    this.isRunning = false;
    this.commandId = 0;
    this.commandQueue = [];
    this.stateOfPidList = Object.create(null);
  }

  handleEvent(event) {
    switch (event.type) {
      case WINDOW_TERMINATED_EVENT_NAME:
        if (!event.detail.processid) break;
        this.enqueueCommand({
          type: 'remove-priority',
          pid: event.detail.processid
        });
        break;
      case ENQUEUE_EVENT_NAME:
        const command = event.detail;
        if (this.verifyCommand(command)) {
          this.enqueueCommand(command);
        }
        break;
    }
  }

  verifyCommand(command) {
    if (!command) {
      debug(`Invalid command: ${command}`);
      return false;
    }

    if (!Object.values(COMMAND_TYPE).includes(command.type)) {
      debug(`Invalid command type: ${command.type}`);
      return false;
    }

    switch (command.type) {
      case COMMAND_TYPE.SET_PRIORITY: {
        if (!validator.isValidPid(command.pid)) {
          debug(`Invalid pid: ${command.pid}`);
          return false;
        }
        if (!validator.isValidGroupType(command.groupType)) {
          debug(`Invalid groupType: ${command.groupType}`);
          return false;
        }
        break;
      }
      case COMMAND_TYPE.REMOVE_PRIORITY: {
        if (!validator.isValidPid(command.pid)) {
          debug(`Invalid pid: ${command.pid}`);
          return false;
        }
        break;
      }
    }

    return true;
  }

  enqueueCommand(command) {
    command.id = ++this.commandId;

    // Drop if the command is trying to set the same priority.
    if (command.type === COMMAND_TYPE.SET_PRIORITY) {
      const stateOfPid = this.stateOfPidList[command.pid];
      if (stateOfPid && command.groupType === stateOfPid.groupType) {
        command.status = 'dropped';
        debug(
          `[Op #${
            command.id
          }] Dropped a new command (type=${
            command.type
          },pid=${
            command.pid
          },group=${
            command.groupType
          }), reason = the same as the current state.`
        );
        return;
      }
    }

    debug(
      `[Op #${
        command.id
      }] Enqueued a new command (type=${
        command.type
      },pid=${
        command.pid
      },group=${
        command.groupType
      })`
    );

    command.status = 'pending';
    this.commandQueue.push(command);

    // Trigger the queue consumption every time we enqueued a new command.
    this.consume();
  }

  async consume() {
    if (this.isRunning) { return; }
    this.isRunning = true;

    // Only perform the optimization when the queue has more than one command.
    if (this.commandQueue.length >= 2) {
      this.commandQueue = compose(this.commandQueue);
    }

    const targetCommand = this.commandQueue[0];
    if (targetCommand) {
      // Perform the task.
      targetCommand.status = 'working';
      try {
        switch (targetCommand.type) {
          case COMMAND_TYPE.SET_PRIORITY: {
            // Preserve the last state of the pid.
            this.stateOfPidList[targetCommand.pid] = targetCommand;
            await setProcessPriority(targetCommand);
            break;
          }
          case COMMAND_TYPE.REMOVE_PRIORITY: {
            delete this.stateOfPidList[targetCommand.pid]
            await removeProcessPriority(targetCommand);
            break;
          }
        }
        targetCommand.status = 'done';
      } catch (err) {
        targetCommand.status = 'failed';
        // Reset the last state of the pid.
        delete this.stateOfPidList[targetCommand.pid]
        debug('Failed to perform the command! Skipping..');
      }
      // Remove from the queue.
      this.commandQueue.shift();

      // Reset the running state.
      this.isRunning = false;

      // Recursively consuming the queued commands.
      await this.consume();
    } else {
      // Reset the running state.
      this.isRunning = false;
    }
  }
}

function debug(message) {
  if (window.DUMP) {
    window.DUMP('[ProcessPriorityManager]' + message);
  }
}

export default new ProcessPriorityManager();
