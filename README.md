# TimeVault - Decentralized Time-Locked STX Escrow Protocol

## Overview

TimeVault is a trustless escrow system built on the Stacks blockchain that enables users to schedule future STX transfers with automatic execution at predetermined block heights. The protocol provides a secure and transparent way to implement delayed payments, automated savings plans, and treasury management.

## Key Features

- **Time-Locked Transfers**: Schedule STX transfers to execute automatically at a specified future block height
- **Trustless Escrow**: Funds are held securely by the smart contract until the unlock time
- **Flexible Cancellation**: Senders can cancel pending transfers before execution
- **Batch Execution**: Execute multiple transfers in a single transaction
- **Emergency Controls**: Administrative pause functionality for system security
- **Transfer Tracking**: Comprehensive lifecycle tracking with sender statistics
- **Memo Support**: Attach optional notes (up to 34 characters) to transfers

## Architecture

### Core Components

**Scheduled Transfers Map**
Stores all transfer details including sender, recipient, amount, unlock block height, completion status, and optional memo.

**Sender Transfer Registry**
Tracks the number of transfers created by each user for statistics and analytics.

**Administrative Controls**
Includes admin principal management and emergency pause functionality.

## Constants

- **min-blocks-before-execution**: `u1` - Minimum blocks required between scheduling and execution
- **memo-max-length**: `u34` - Maximum character length for transfer notes

## Error Codes

- `ERR-UNAUTHORIZED-ACCESS (u100)`: Caller lacks required permissions
- `ERR-INVALID-TARGET-BLOCK (u101)`: Unlock block height is invalid
- `ERR-INSUFFICIENT-BALANCE (u102)`: Sender has insufficient STX balance
- `ERR-TRANSFER-NOT-FOUND (u103)`: Transfer ID does not exist
- `ERR-ALREADY-EXECUTED (u104)`: Transfer has already been completed
- `ERR-EXECUTION-TOO-EARLY (u105)`: Current block height is before unlock time
- `ERR-TRANSFER-FAILURE (u106)`: STX transfer operation failed
- `ERR-INVALID-RECIPIENT (u107)`: Recipient address is invalid
- `ERR-INVALID-TRANSFER-ID (u108)`: Transfer ID is out of range
- `ERR-SELF-TRANSFER-PROHIBITED (u109)`: Sender and recipient cannot be the same
- `ERR-INVALID-MEMO (u110)`: Memo exceeds maximum length

## Public Functions

### User Functions

#### create-scheduled-transfer
Creates a new time-locked STX transfer.

**Parameters:**
- `recipient` (principal): Destination address for the transfer
- `transfer-amount` (uint): Amount of STX to lock in microSTX
- `delay-blocks` (uint): Number of blocks until execution
- `transfer-note` (optional string-utf8 34): Optional memo for the transfer

**Returns:** Transfer ID (uint)

**Validations:**
- Protocol must not be paused
- Recipient must be valid and different from sender
- Delay must be at least minimum blocks
- Amount must be greater than zero
- Sender must have sufficient balance
- Memo must not exceed maximum length

#### execute-transfer
Executes a matured time-locked transfer.

**Parameters:**
- `id` (uint): Transfer identifier to execute

**Returns:** Boolean success indicator

**Requirements:**
- Protocol must not be paused
- Transfer must exist and not be completed
- Current block height must be at or past unlock block

#### execute-multiple
Executes multiple transfers in a single transaction.

**Parameters:**
- `ids` (list 10 uint): List of transfer identifiers (max 10)

**Returns:** List of execution results

#### cancel-transfer
Cancels a pending transfer and refunds the sender.

**Parameters:**
- `id` (uint): Transfer identifier to cancel

**Returns:** Boolean success indicator

**Authorization:**
- Must be called by the original sender or admin
- Transfer must not already be completed

### Administrative Functions

#### transfer-admin-rights
Transfers administrative privileges to a new principal.

**Parameters:**
- `new-admin` (principal): Principal to receive admin rights

**Authorization:** Current admin only

#### set-pause-state
Toggles the protocol pause state for emergency control.

**Returns:** New pause state (boolean)

**Authorization:** Admin only

#### admin-cancel
Administrative function to cancel any transfer.

**Parameters:**
- `id` (uint): Transfer identifier to cancel

**Authorization:** Admin only

## Read-Only Functions

### System Information

- `get-admin()`: Returns current administrator address
- `check-protocol-status()`: Returns whether protocol is active (not paused)
- `get-transfer-count()`: Returns total number of transfers created

### Transfer Queries

- `transfer-exists(id)`: Checks if a transfer ID exists
- `get-transfer-details(id)`: Retrieves complete transfer information
- `is-executable(id)`: Checks if transfer meets execution requirements
- `has-been-executed(id)`: Returns completion status of a transfer
- `blocks-remaining(id)`: Calculates blocks until unlock time

### User Queries

- `get-sender-transfer(id, caller)`: Retrieves transfer details with sender authorization
- `get-sender-stats(user)`: Returns total transfers created by a user

## Usage Examples

### Creating a Time-Locked Transfer

```clarity
;; Schedule 100 STX to be transferred in 144 blocks (approximately 1 day)
(contract-call? .timevault create-scheduled-transfer 
  'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
  u100000000
  u144
  (some u"Payment for services"))
```

### Executing a Transfer

```clarity
;; Execute transfer with ID 0 after unlock time
(contract-call? .timevault execute-transfer u0)
```

### Canceling a Transfer

```clarity
;; Cancel transfer with ID 0 before execution
(contract-call? .timevault cancel-transfer u0)
```

### Checking Transfer Status

```clarity
;; Check if transfer is ready to execute
(contract-call? .timevault is-executable u0)

;; Get remaining blocks until unlock
(contract-call? .timevault blocks-remaining u0)
```

## Security Considerations

### Access Control
- Only the original sender or admin can cancel transfers
- Admin functions are protected by principal verification
- Emergency pause mechanism for critical situations

### Transfer Validation
- Prevents self-transfers
- Validates recipient addresses
- Ensures sufficient balances before locking funds
- Minimum delay requirement prevents immediate execution

### Funds Safety
- Funds are held by the contract until execution or cancellation
- Automatic refund on cancellation
- No withdrawal function ensures funds can only go to intended recipient

## Best Practices

1. **Block Height Planning**: Account for network conditions when setting delay blocks
2. **Memo Usage**: Keep memos concise and within the 34-character limit
3. **Balance Management**: Ensure sufficient balance before creating transfers
4. **Monitoring**: Track transfer IDs for later execution or cancellation
5. **Batch Operations**: Use execute-multiple for efficient multi-transfer execution

## Limitations

- Maximum 10 transfers can be executed in a single batch operation
- Memo length is limited to 34 UTF-8 characters
- Minimum delay of 1 block required between scheduling and execution
- Transfer IDs are sequential and cannot be reused