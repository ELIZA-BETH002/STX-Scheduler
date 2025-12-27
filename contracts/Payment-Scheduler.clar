;; TimeVault - Decentralized Time-Locked STX Escrow Protocol Contract
;;
;; Clarity Version: 4
;; Epoch: 3.3
;;
;; TimeVault enables users to schedule future STX transfers with automatic execution
;; at predetermined block heights. This trustless escrow system supports delayed payments,
;; automated savings plans, and treasury management.

;; Error codes for operation failures
(define-constant ERR-UNAUTHORIZED-ACCESS (err u100))
(define-constant ERR-INVALID-TARGET-BLOCK (err u101))
(define-constant ERR-INSUFFICIENT-BALANCE (err u102))
(define-constant ERR-TRANSFER-NOT-FOUND (err u103))
(define-constant ERR-ALREADY-EXECUTED (err u104))
(define-constant ERR-EXECUTION-TOO-EARLY (err u105))
(define-constant ERR-TRANSFER-FAILURE (err u106))
(define-constant ERR-INVALID-RECIPIENT (err u107))
