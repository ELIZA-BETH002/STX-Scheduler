;; TimeVault - Decentralized Time-Locked STX Escrow Protocol Contract
;;
;; TimeVault enables users to schedule future STX transfers with automatic execution
;; at predetermined block heights. This trustless escrow system supports delayed payments,
;; automated savings plans, and treasury management with comprehensive security validations,
;; flexible cancellation policies, and detailed lifecycle tracking.

;; Error codes for operation failures
(define-constant ERR-UNAUTHORIZED-ACCESS (err u100))
(define-constant ERR-INVALID-TARGET-BLOCK (err u101))
(define-constant ERR-INSUFFICIENT-BALANCE (err u102))
(define-constant ERR-TRANSFER-NOT-FOUND (err u103))
(define-constant ERR-ALREADY-EXECUTED (err u104))
(define-constant ERR-EXECUTION-TOO-EARLY (err u105))
(define-constant ERR-TRANSFER-FAILURE (err u106))
(define-constant ERR-INVALID-RECIPIENT (err u107))
(define-constant ERR-INVALID-TRANSFER-ID (err u108))
(define-constant ERR-SELF-TRANSFER-PROHIBITED (err u109))
(define-constant ERR-INVALID-MEMO (err u110))

;; Minimum blocks required between scheduling and execution
(define-constant min-blocks-before-execution u1)

;; Maximum character length for transfer notes
(define-constant memo-max-length u34)

;; Principal authorized to perform administrative operations
(define-data-var admin-principal principal tx-sender)

;; Sequential identifier for tracking all transfers
(define-data-var transfer-id-counter uint u0)

;; System-wide emergency pause flag
(define-data-var is-paused bool false)

;; Core storage for scheduled transfer details
(define-map scheduled-transfers
  { id: uint }
  {
    sender: principal,
    recipient: principal,
    amount: uint,
    note: (optional (string-utf8 34)),
    unlock-at-block: uint,
    is-completed: bool,
    scheduled-at-block: uint,
    scheduled-at-burn-block: uint
  }
)

;; Index tracking number of transfers per user
(define-map sender-transfer-registry
  { sender-address: principal }
  { count: uint }
)

;; Returns the current administrator address
(define-read-only (get-admin)
  (ok (var-get admin-principal))
)

;; Transfers admin rights to a new principal
;; Only callable by current admin
(define-public (transfer-admin-rights (new-admin principal))
  (let ((current-admin (var-get admin-principal)))
    (asserts! (is-eq tx-sender current-admin) ERR-UNAUTHORIZED-ACCESS)
    (asserts! (is-some (to-consensus-buff? new-admin)) ERR-INVALID-RECIPIENT)
    (asserts! (not (is-eq new-admin current-admin)) ERR-SELF-TRANSFER-PROHIBITED)
    (var-set admin-principal new-admin)
    (ok true)
  )
)

;; Toggles the protocol pause state for emergency control
;; Only callable by admin
(define-public (set-pause-state)
  (let ((current-admin (var-get admin-principal)))
    (asserts! (is-eq tx-sender current-admin) ERR-UNAUTHORIZED-ACCESS)
    (var-set is-paused (not (var-get is-paused)))
    (ok (var-get is-paused))
  )
)

;; Checks if the protocol is currently active
(define-read-only (check-protocol-status)
  (ok (not (var-get is-paused)))
)

;; Returns total number of transfers created
(define-read-only (get-transfer-count)
  (ok (var-get transfer-id-counter))
)

;; Verifies if a transfer ID exists in the system
(define-read-only (transfer-exists (id uint))
  (ok (is-some (map-get? scheduled-transfers { id: id })))
)

;; Retrieves complete transfer details by ID
(define-read-only (get-transfer-details (id uint))
  (match (map-get? scheduled-transfers { id: id })
    transfer-data (ok transfer-data)
    ERR-TRANSFER-NOT-FOUND
  )
)

;; Checks if a transfer meets execution requirements
(define-read-only (is-executable (id uint))
  (match (map-get? scheduled-transfers { id: id })
    transfer-data 
      (ok (and 
        (not (get is-completed transfer-data))
        (>= block-height (get unlock-at-block transfer-data))
        (not (var-get is-paused))
      ))
    ERR-TRANSFER-NOT-FOUND
  )
)

;; Returns completion status of a transfer
(define-read-only (has-been-executed (id uint))
  (match (map-get? scheduled-transfers { id: id })
    transfer-data (ok (get is-completed transfer-data))
    ERR-TRANSFER-NOT-FOUND
  )
)

;; Retrieves transfer details with sender authorization
(define-read-only (get-sender-transfer (id uint) (caller principal))
  (match (map-get? scheduled-transfers { id: id })
    transfer-data 
      (if (is-eq (get sender transfer-data) caller)
        (ok transfer-data)
        ERR-UNAUTHORIZED-ACCESS
      )
    ERR-TRANSFER-NOT-FOUND
  )
)

;; Returns total transfers created by a user
(define-read-only (get-sender-stats (user principal))
  (match (map-get? sender-transfer-registry { sender-address: user })
    stats (ok (get count stats))
    (ok u0)
  )
)

;; Calculates remaining blocks until transfer unlocks
(define-read-only (blocks-remaining (id uint))
  (match (map-get? scheduled-transfers { id: id })
    transfer-data
      (let ((unlock-block (get unlock-at-block transfer-data)))
        (if (>= block-height unlock-block)
          (ok u0)
          (ok (- unlock-block block-height))
        )
      )
    ERR-TRANSFER-NOT-FOUND
  )
)

;; Creates a new time-locked STX transfer
(define-public (create-scheduled-transfer 
                (recipient principal) 
                (transfer-amount uint) 
                (delay-blocks uint) 
                (transfer-note (optional (string-utf8 34))))
  (let 
    (
      (caller tx-sender)
      (new-id (var-get transfer-id-counter))
      (execution-block (+ block-height delay-blocks))
      (current-block block-height)
      (sender-count (default-to u0 
        (get count 
          (map-get? sender-transfer-registry { sender-address: caller }))))
      (validated-note (if (is-some transfer-note)
                        (let ((note-text (unwrap-panic transfer-note)))
                          (if (<= (len note-text) memo-max-length)
                            (some note-text)
                            none))
                        none))
    )
    (asserts! (not (var-get is-paused)) ERR-UNAUTHORIZED-ACCESS)
    (asserts! (is-some (to-consensus-buff? recipient)) ERR-INVALID-RECIPIENT)
    (asserts! (not (is-eq recipient caller)) ERR-SELF-TRANSFER-PROHIBITED)
    (asserts! (>= delay-blocks min-blocks-before-execution) ERR-INVALID-TARGET-BLOCK)
    (asserts! (> transfer-amount u0) ERR-INSUFFICIENT-BALANCE)
    (asserts! (>= (stx-get-balance caller) transfer-amount) ERR-INSUFFICIENT-BALANCE)
    (match transfer-note
      note-string 
        (asserts! (<= (len note-string) memo-max-length) ERR-INVALID-MEMO)
      true
    )
    (try! (stx-transfer? transfer-amount caller (as-contract tx-sender)))
    (map-set scheduled-transfers
      { id: new-id }
      {
        sender: caller,
        recipient: recipient,
        amount: transfer-amount,
        note: validated-note,
        unlock-at-block: execution-block,
        is-completed: false,
        scheduled-at-block: current-block,
        scheduled-at-burn-block: burn-block-height
      }
    )
    (map-set sender-transfer-registry
      { sender-address: caller }
      { count: (+ sender-count u1) }
    )
    (var-set transfer-id-counter (+ new-id u1))
    (ok new-id)
  )
)

;; Executes a matured time-locked transfer
(define-public (execute-transfer (id uint))
  (let ((total-count (var-get transfer-id-counter)))
    (asserts! (not (var-get is-paused)) ERR-UNAUTHORIZED-ACCESS)
    (asserts! (< id total-count) ERR-INVALID-TRANSFER-ID)
    (let 
      (
        (transfer-data (unwrap! (map-get? scheduled-transfers { id: id }) ERR-TRANSFER-NOT-FOUND))
        (sender-address (get sender transfer-data))
        (recipient-address (get recipient transfer-data))
        (locked-amount (get amount transfer-data))
        (already-completed (get is-completed transfer-data))
        (unlock-block (get unlock-at-block transfer-data))
      )
      (asserts! (not already-completed) ERR-ALREADY-EXECUTED)
      (asserts! (>= block-height unlock-block) ERR-EXECUTION-TOO-EARLY)
      (try! (as-contract (stx-transfer? locked-amount tx-sender recipient-address)))
      (map-set scheduled-transfers
        { id: id }
        (merge transfer-data { is-completed: true })
      )
      (ok true)
    )
  )
)

;; Executes multiple transfers in a single transaction
(define-public (execute-multiple (ids (list 10 uint)))
  (let ((results (map execute-transfer ids)))
    (ok results)
  )
)

;; Cancels a pending transfer and refunds the sender
(define-public (cancel-transfer (id uint))
  (let ((total-count (var-get transfer-id-counter)))
    (asserts! (< id total-count) ERR-INVALID-TRANSFER-ID)
    (let 
      (
        (transfer-data (unwrap! (map-get? scheduled-transfers { id: id }) ERR-TRANSFER-NOT-FOUND))
        (sender-address (get sender transfer-data))
        (refund-amount (get amount transfer-data))
        (already-completed (get is-completed transfer-data))
        (current-admin (var-get admin-principal))
      )
      (asserts! (not already-completed) ERR-ALREADY-EXECUTED)
      (asserts! (or 
                 (is-eq tx-sender sender-address)
                 (is-eq tx-sender current-admin)
                ) 
                ERR-UNAUTHORIZED-ACCESS)
      (try! (as-contract (stx-transfer? refund-amount tx-sender sender-address)))
      (map-set scheduled-transfers
        { id: id }
        (merge transfer-data { is-completed: true })
      )
      (ok true)
    )
  )
)

;; Administrative function to cancel any transfer
(define-public (admin-cancel (id uint))
  (let 
    (
      (current-admin (var-get admin-principal))
      (total-count (var-get transfer-id-counter))
    )
    (asserts! (is-eq tx-sender current-admin) ERR-UNAUTHORIZED-ACCESS)
    (asserts! (< id total-count) ERR-INVALID-TRANSFER-ID)
    (let 
      (
        (transfer-data (unwrap! (map-get? scheduled-transfers { id: id }) ERR-TRANSFER-NOT-FOUND))
        (sender-address (get sender transfer-data))
        (refund-amount (get amount transfer-data))
        (already-completed (get is-completed transfer-data))
      )
      (asserts! (not already-completed) ERR-ALREADY-EXECUTED)
      (try! (as-contract (stx-transfer? refund-amount tx-sender sender-address)))
      (map-set scheduled-transfers
        { id: id }
        (merge transfer-data { is-completed: true })
      )
      (ok true)
    )
  )
)

;; Initialize contract with default state
(begin
  (var-set admin-principal tx-sender)
  (var-set transfer-id-counter u0)
  (var-set is-paused false)
)