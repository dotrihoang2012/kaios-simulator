.PHONY: build
build::
	@$(MAKE) -C remote build

include node_modules/fatigue-scripts/webapp.mk

BABEL_TAPE_RUNNER := $(BIN_DIR)/babel-tape-runner
TAP_NOTIFY := $(BIN_DIR)/tap-notify
FAUCET := $(BIN_DIR)/faucet
JEST := $(BIN_DIR)/jest

.PHONY: test
test:
	@node --no-deprecation $(JEST) --bail ./test/
